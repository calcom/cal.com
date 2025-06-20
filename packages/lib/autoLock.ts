import type { RatelimitResponse } from "@unkey/ratelimit";

import { hashAPIKey } from "@calcom/features/ee/api-keys/lib/apiKeys";
import { RedisService } from "@calcom/features/redis/RedisService";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";

import logger from "./logger";

// This is the number of times a user can exceed the rate limit before being locked
const DEFAULT_AUTOLOCK_THRESHOLD = 5;
const DEFAULT_AUTOLOCK_WARNING_THRESHOLD = 3;
// This is the duration of the rate limit check window
const DEFAULT_CHECK_THRESHOLD_WINDOW_DURATION = 60 * 30 * 1000; // 30 minutes in milliseconds

interface HandleAutoLockInput {
  identifier: string;
  identifierType: "email" | "userId" | "SMS" | "apiKey";
  rateLimitResponse: RatelimitResponse;
  identifierKeyword?: string; // For instances where we have like "addSecondaryEmail.${email}"
  autolockThreshold?: number;
  autolockWarningThreshold?: number;
  autolockDuration?: number; // in milliseconds
}

export enum LockReason {
  RATE_LIMIT = "Auto-locking user due to rate limit exceeded",
  SPAM_WORKFLOW_BODY = "Auto-locking user due to spam detected in workflow body",
}

const log = logger.getSubLogger({ prefix: ["[autoLock]"] });

/**
 * The "Requests to Hit Limit × Threshold" shows how many requests would be needed to trigger an auto-lock if a user consistently hits
 * its their rate limit. For example, in the "core" * namespace, a user would need to make at least 50 requests (10 limit × 5 threshold)
 * within the 30-minute window to get auto-locked.
 */
export async function handleAutoLock({
  identifier: _identifier,
  identifierType,
  rateLimitResponse,
  identifierKeyword,
  autolockThreshold = DEFAULT_AUTOLOCK_THRESHOLD,
  autolockWarningThreshold = DEFAULT_AUTOLOCK_WARNING_THRESHOLD,
  autolockDuration = DEFAULT_CHECK_THRESHOLD_WINDOW_DURATION,
}: HandleAutoLockInput): Promise<boolean> {
  const { success, remaining } = rateLimitResponse;

  const UPSTASH_ENV_FOUND = process.env.UPSTASH_REDIS_REST_TOKEN && process.env.UPSTASH_REDIS_REST_URL;

  if (!UPSTASH_ENV_FOUND) {
    log.warn("Skipping auto lock because UPSTASH env variables are not set");
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

      log.info(
        `Rate limit exceeded for ${identifierType}: ${identifier}. Current count: ${currentCount}/${autolockThreshold}`
      );

      if (currentCount + 1 >= autolockWarningThreshold && currentCount + 1 < autolockThreshold) {
        await sendWarningEmailIfNeeded(identifierType, identifier, currentCount + 1, autolockThreshold);
      }

      // If they have exceeded the threshold, lock them
      if (currentCount + 1 >= autolockThreshold) {
        log.warn(
          `Auto-locking ${identifierType}: ${identifier}. Threshold reached: ${
            currentCount + 1
          }/${autolockThreshold}`
        );
        await lockUser(identifierType, identifier, LockReason.RATE_LIMIT);
        await redis.del(lockKey);
        return true;
      }

      await redis.set(lockKey, (currentCount + 1).toString());
      await redis.expire(lockKey, Math.floor(autolockDuration / 1000));
      return false;
    } catch (err) {
      if (err instanceof Error && err.message === "No user found for this API key.") {
        log.error(`Error in auto-lock: No user found for API key: ${identifier}`);
        throw err;
      }
      log.error(`Error in auto-lock process: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  return false;
}

export async function lockUser(identifierType: string, identifier: string, lockReason: LockReason) {
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
    log.warn(lockReason, {
      userId: user.id,
      email: user.email,
      username: user.username,
    });
  }
}

async function sendWarningEmailIfNeeded(
  identifierType: string,
  identifier: string,
  currentCount: number,
  threshold: number
) {
  const redis = new RedisService();
  const warningKey = `autolock:${identifierType}:${identifier}.warning.${currentCount}`;

  const warningSent = await redis.get(warningKey);
  if (warningSent) {
    return; // Already sent warning for this count
  }

  try {
    const user = await getUserForWarningEmail(identifierType, identifier);
    if (!user) {
      log.warn(`Could not find user for warning email: ${identifierType}:${identifier}`);
      return;
    }

    const { sendAccountLockWarningEmail } = await import("@calcom/emails/email-manager");

    await sendAccountLockWarningEmail({
      user,
      currentCount,
      threshold,
    });

    await redis.set(warningKey, "1");
    await redis.expire(warningKey, 60 * 60 * 24); // Expire after 24 hours

    log.info(
      `Sent account lock warning email to ${identifierType}: ${identifier} (${currentCount}/${threshold})`
    );
  } catch (error) {
    log.error(`Failed to send warning email: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function getUserForWarningEmail(identifierType: string, identifier: string) {
  const userData = await getUserData(identifierType, identifier);
  if (!userData) return null;

  const t = await getTranslation(userData.locale || "en", "common");

  return {
    id: userData.id,
    name: userData.username || userData.email.split("@")[0],
    email: userData.email,
    t,
  };
}

async function getUserData(identifierType: string, identifier: string) {
  switch (identifierType) {
    case "userId":
      return await prisma.user.findUnique({
        where: { id: Number(identifier) },
        select: {
          id: true,
          email: true,
          username: true,
          locale: true,
        },
      });
    case "email":
      return await prisma.user.findUnique({
        where: { email: identifier },
        select: {
          id: true,
          email: true,
          username: true,
          locale: true,
        },
      });
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
              locale: true,
            },
          },
        },
      });
      return apiKey?.user || null;
    default:
      return null;
  }
}
