import type { RatelimitResponse } from "@unkey/ratelimit";
import crypto from "crypto";

import { hashAPIKey } from "@calcom/features/ee/api-keys/lib/apiKeys";
import { RedisService } from "@calcom/features/redis/RedisService";
import prisma from "@calcom/prisma";

const DEFAULT_AUTOLOCK_THRESHOLD = 5;
const DEFAULT_AUTOLOCK_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

interface HandleAutoLockInput {
  identifier: string;
  identifierType: "ip" | "email" | "userId" | "SMS" | "apiKey";
  rateLimitResponse: RatelimitResponse;
  identifierKeyword?: string; // For instances where we have like "addSecondaryEmail.${email}"
  autolockThreshold?: number;
  autolockDuration?: number; // in milliseconds
}

export async function handleAutoLock({
  identifier: _identifier,
  identifierType,
  rateLimitResponse,
  identifierKeyword,
  autolockThreshold = DEFAULT_AUTOLOCK_THRESHOLD,
  autolockDuration = DEFAULT_AUTOLOCK_DURATION,
}: HandleAutoLockInput): Promise<boolean> {
  const { success, remaining } = rateLimitResponse;

  const UPSTASH_ENV_FOUND = process.env.UPSTASH_REDIS_REST_TOKEN && process.env.UPSTASH_REDIS_REST_URL;

  if (!UPSTASH_ENV_FOUND) {
    console.log("Skipping auto lock because UPSTASH env variables are not set");
    return false;
  }

  let identifier = identifierKeyword
    ? _identifier.toString().replace(`${identifierKeyword}.`, "")
    : _identifier;

  if (["ip"].includes(identifierType)) {
    identifier = crypto.createHash("sha256").update(identifier).digest("hex");
  }

  if (!success && remaining <= 0) {
    const redis = new RedisService();
    const lockKey = `autolock:${identifierType}${
      identifierKeyword ? `:${identifierKeyword}` : ""
    }:${identifier}.count`;

    try {
      const count = await redis.get(lockKey);
      const currentCount = count ? parseInt(count.toString(), 10) : 0;

      if (currentCount + 1 >= autolockThreshold) {
        await lockUser(identifierType, identifier);
        await redis.del(lockKey);
        return true;
      } else {
        await redis.set(lockKey, (currentCount + 1).toString());
        await redis.expire(lockKey, Math.floor(autolockDuration / 1000));
        return false;
      }
    } catch (err) {
      return false;
    }
  }

  return false;
}

async function lockUser(identifierType: "ip" | "email" | "userId" | "SMS" | "apiKey", identifier: string) {
  const UPSTASH_ENV_FOUND = process.env.UPSTASH_REDIS_REST_TOKEN && process.env.UPSTASH_REDIS_REST_URL;

  if (!UPSTASH_ENV_FOUND) {
    console.log("Skipping auto lock because UPSTASH env variables are not set");
    return;
  }

  const redis = new RedisService();

  switch (identifierType) {
    case "userId":
      await prisma.user.update({
        where: { id: Number(identifier) },
        data: { locked: true },
      });
      break;
    case "email":
      await prisma.user.update({
        where: { email: identifier },
        data: { locked: true },
      });
      break;
    case "ip":
      await redis.set(`ip:${identifier}`, "locked");
      await redis.expire(`ip:${identifier}`, Math.floor(DEFAULT_AUTOLOCK_DURATION / 1000));
      break;
    case "apiKey":
      const hashedApiKey = hashAPIKey(identifier);
      const apiKey = await prisma.apiKey.findUnique({
        where: { hashedKey: hashedApiKey },
        include: {
          user: {
            select: { id: true },
          },
        },
      });

      if (!apiKey || !apiKey.user) {
        throw new Error("No user found for this API key.");
      }
      await prisma.user.update({
        where: { id: apiKey.user.id },
        data: { locked: true },
      });
      break;
    // Leaving SMS here but it is handled differently via checkRateLimitForSMS that auto locks
    case "SMS":
      break;
    default:
      throw new Error("Invalid identifier type for locking");
  }
}

async function checkIpIsLocked(ip: string): Promise<boolean> {
  const UPSTASH_ENV_FOUND = process.env.UPSTASH_REDIS_REST_TOKEN && process.env.UPSTASH_REDIS_REST_URL;

  if (!UPSTASH_ENV_FOUND) {
    return false;
  }

  const redis = new RedisService();
  const hashedIp = crypto.createHash("sha256").update(ip).digest("hex");

  const isLocked = await redis.get(`ip:${hashedIp}`);
  return isLocked === "locked";
}

export async function checkIpIsLockedAndThrowError(ip: string) {
  const isLocked = await checkIpIsLocked(ip);
  if (isLocked) {
    throw new Error("You have been locked due to suspicious activity.");
  }
}
