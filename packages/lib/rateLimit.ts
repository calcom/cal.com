import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { isIpInBanListString } from "./getIP";
import logger from "./logger";

const log = logger.getSubLogger({ prefix: ["RateLimit"] });

export type RateLimitHelper = {
  rateLimitingType?: "core" | "forcedSlowMode" | "common" | "api" | "ai";
  identifier: string;
};

export type RatelimitResponse = {
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

let warningDisplayed = false;

/** Prevent flooding the logs while testing/building */
function logOnce(message: string) {
  if (warningDisplayed) return;
  log.warn(message);
  warningDisplayed = true;
}

export function rateLimiter() {
  const UPSATCH_ENV_FOUND = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!UPSATCH_ENV_FOUND) {
    logOnce("Disabled due to not finding UPSTASH env variables");
    return () => ({ success: true, limit: 10, remaining: 999, reset: 0 } as RatelimitResponse);
  }

  const redis = Redis.fromEnv();
  const limiter = {
    core: new Ratelimit({
      redis,
      analytics: true,
      prefix: "ratelimit",
      limiter: Ratelimit.fixedWindow(10, "60s"),
    }),
    common: new Ratelimit({
      redis,
      analytics: true,
      prefix: "ratelimit",
      limiter: Ratelimit.fixedWindow(200, "60s"),
    }),
    forcedSlowMode: new Ratelimit({
      redis,
      analytics: true,
      prefix: "ratelimit:slowmode",
      limiter: Ratelimit.fixedWindow(1, "30s"),
    }),
    api: new Ratelimit({
      redis,
      analytics: true,
      prefix: "ratelimit:api",
      limiter: Ratelimit.fixedWindow(10, "60s"),
    }),
    ai: new Ratelimit({
      redis,
      analytics: true,
      prefix: "ratelimit",
      limiter: Ratelimit.fixedWindow(20, "1d"),
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
