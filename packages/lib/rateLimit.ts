import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { isIpInBanListString } from "./getIP";
import logger from "./logger";

const log = logger.getChildLogger({ prefix: ["RateLimit"] });

type RateLimitHelper = {
  rateLimitingType?: "core" | "forcedSlowMode";
  identifier: string;
};

function rateLimiter() {
  const UPSATCH_ENV_FOUND = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!UPSATCH_ENV_FOUND) {
    log.warn("Disabled due to not finding UPSTASH env variables");
    return () => ({ success: true });
  }

  const redis = Redis.fromEnv();
  const limiter = {
    core: new Ratelimit({
      redis,
      analytics: true,
      prefix: "ratelimit",
      limiter: Ratelimit.fixedWindow(10, "60s"),
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

export default rateLimiter;
