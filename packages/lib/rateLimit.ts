import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { TRPCError } from "@trpc/server";

import { isIpInBanListString } from "./getIP";
import logger from "./logger";

const log = logger.getChildLogger({ prefix: ["RateLimit"] });

type RateLimitHelper = {
  rateLimitingType?: "core" | "forcedSlowMode";
  identifier: string;
};

type RatelimitResponse = {
  /**
   * Whether the request may pass(true) or exceeded the limit(false)
   */
  success: boolean;
  /**
   * Maximum number of requests allowed within a window.
   */
  limit: number;
  /**
   * How many requests the user has left within the current window.
   */
  remaining: number;
  /**
   * Unix timestamp in milliseconds when the limits are reset.
   */
  reset: number;

  pending: Promise<unknown>;
};

function rateLimiter() {
  const UPSATCH_ENV_FOUND = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!UPSATCH_ENV_FOUND) {
    log.warn("Disabled due to not finding UPSTASH env variables");
    return () => ({ success: true } as RatelimitResponse);
  }

  const redis = Redis.fromEnv();
  const limiter = {
    core: new Ratelimit({
      redis,
      analytics: true,
      prefix: "ratelimit",
      limiter: Ratelimit.fixedWindow(1, "60s"),
    }),
    forcedSlowMode: new Ratelimit({
      redis,
      analytics: true,
      prefix: "ratelimit:slowmode",
      limiter: Ratelimit.fixedWindow(1, "30s"),
    }),
  };

  async function rateLimit({ rateLimitingType = "core", identifier }: RateLimitHelper) {
    if (isIpInBanListString(identifier)) {
      return await limiter.forcedSlowMode.limit(identifier);
    }

    return await limiter[rateLimitingType].limit(identifier);
  }

  return rateLimit;
}

export async function checkRateLimitAndThrowError({
  rateLimitingType = "core",
  identifier,
}: RateLimitHelper) {
  const { remaining, reset } = await rateLimiter()({ rateLimitingType, identifier });

  if (remaining < 0) {
    const convertToSeconds = (ms: number) => Math.floor(ms / 1000);
    const secondsToWait = convertToSeconds(reset - Date.now());
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded. Try again in ${secondsToWait} seconds.`,
    });
  }
}

export default rateLimiter;
