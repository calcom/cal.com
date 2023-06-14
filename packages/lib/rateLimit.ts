/* eslint-disable @typescript-eslint/no-explicit-any */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { isIpInBanListString } from "./getIP";

const redis = Redis.fromEnv();

const limitter = {
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

type RateLimitHelper = {
  rateLimitingType?: keyof typeof limitter;
  identifier: string;
};

async function rateLimit({ rateLimitingType = "core", identifier }: RateLimitHelper) {
  if (!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)) {
    console.log("Rate limit skipped - UPSTASH not set");
    return { success: true };
  }

  if (isIpInBanListString(identifier)) {
    return await limitter.forcedSlowMode.limit(identifier);
  }

  return await limitter[rateLimitingType].limit(identifier);
}

export default rateLimit;
