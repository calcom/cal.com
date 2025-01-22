import * as Sentry from "@sentry/nextjs";
import type { RatelimitResponse } from "@unkey/ratelimit";

import { hashAPIKey } from "@calcom/features/ee/api-keys/lib/apiKeys";
import { RedisService } from "@calcom/features/redis/RedisService";
import prisma from "@calcom/prisma";

const DEFAULT_AUTOLOCK_THRESHOLD = 5;
const DEFAULT_CHECK_THRESHOLD_WINDOW_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

interface HandleAutoLockInput {
  identifier: string;
  identifierType: "email" | "userId" | "SMS" | "apiKey";
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
  autolockDuration = DEFAULT_CHECK_THRESHOLD_WINDOW_DURATION,
}: HandleAutoLockInput): Promise<boolean> {
  const { success, remaining } = rateLimitResponse;

  const UPSTASH_ENV_FOUND = process.env.UPSTASH_REDIS_REST_TOKEN && process.env.UPSTASH_REDIS_REST_URL;

  if (!UPSTASH_ENV_FOUND) {
    console.log("Skipping auto lock because UPSTASH env variables are not set");
    return false;
  }

  const identifier = identifierKeyword
    ? _identifier.toString().replace(`${identifierKeyword}.`, "")
    : _identifier;

  if (!success && remaining <= 0) {
    const redis = new RedisService();
    const lockKey = `autolock:${identifierType}${
      identifierKeyword ? `:${identifierKeyword}` : ""
    }:${identifier}.count`;

    try {
      const count = await redis.get(lockKey);
      const currentCount = count ? parseInt(count.toString(), 10) : 0;

      // If they have exceeded the threshold, lock them
      if (currentCount + 1 >= autolockThreshold) {
        await lockUser(identifierType, identifier);
        await redis.del(lockKey);
        return true;
      }

      await redis.set(lockKey, (currentCount + 1).toString());
      await redis.expire(lockKey, Math.floor(autolockDuration / 1000));
      return false;
    } catch (err) {
      if (err instanceof Error && err.message === "No user found for this API key.") {
        throw err;
      }
      return false;
    }
  }

  return false;
}

async function lockUser(identifierType: string, identifier: string) {
  if (!identifier) {
    return;
  }

  type UserType = {
    id: number;
    email: string;
    username: string | null;
  } | null;

  let user: UserType = null;

  switch (identifierType) {
    case "userId":
      user = await prisma.user.update({
        where: { id: Number(identifier) },
        data: { locked: true },
        select: {
          id: true,
          email: true,
          username: true,
        },
      });
      break;
    case "email":
      user = await prisma.user.update({
        where: { email: identifier },
        data: { locked: true },
        select: {
          id: true,
          email: true,
          username: true,
        },
      });
      break;
    case "apiKey":
      const hashedApiKey = hashAPIKey(identifier);
      const apiKey = await prisma.apiKey.findUnique({
        where: { hashedKey: hashedApiKey },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
            },
          },
        },
      });

      if (!apiKey?.user) {
        throw new Error("No user found for this API key.");
      }

      user = await prisma.user.update({
        where: { id: apiKey.user.id },
        data: { locked: true },
        select: {
          id: true,
          email: true,
          username: true,
        },
      });
      break;
    // Leaving SMS here but it is handled differently via checkRateLimitForSMS that auto locks
    case "SMS":
      break;
    default:
      throw new Error("Invalid identifier type for locking");
  }

  if (user && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.setUser({
      id: user.id.toString(),
      email: user.email,
      username: user.username ?? undefined,
    });
    Sentry.setTag("admin_notify", true);
    Sentry.setTag("auto_lock", true);
    Sentry.captureMessage(`User ${user.email} has been locked due to suspicious activity.`, "warning");
  }
}
