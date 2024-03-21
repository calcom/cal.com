import { Ratelimit, NoopRatelimit, type LimitOptions } from "@unkey/ratelimit";

import { isIpInBanListString } from "./getIP";
import logger from "./logger";

const log = logger.getSubLogger({ prefix: ["RateLimit"] });

export type RateLimitHelper = {
  rateLimitingType?: "core" | "forcedSlowMode" | "common" | "api" | "ai";
  identifier: string;
  opts?: LimitOptions;
  /**
   * Using a callback instead of a regular return to provide headers even
   * when the rate limit is reached and an error is thrown.
   **/
  onRateLimiterResponse?: (response: RatelimitResponse) => void;
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

export const API_KEY_RATE_LIMIT = 30;

export function rateLimiter() {
  const { UNKEY_ROOT_KEY } = process.env;

  if (!UNKEY_ROOT_KEY) {
    logOnce("Disabled due to not finding UNKEY_ROOT_KEY env variable");
    const rl = new NoopRatelimit();
    return () => rl.limit("");
  }

  const limiter = {
    core: new Ratelimit({
      rootKey: UNKEY_ROOT_KEY,
      namespace: "core",
      limit: 10,
      duration: "60s",
      async: true,
    }),
    common: new Ratelimit({
      rootKey: UNKEY_ROOT_KEY,
      namespace: "common",
      limit: 200,
      duration: "60s",
      async: true,
    }),
    forcedSlowMode: new Ratelimit({
      rootKey: UNKEY_ROOT_KEY,
      namespace: "forcedSlowMode",
      limit: 1,
      duration: "30s",
      async: true,
    }),
    api: new Ratelimit({
      rootKey: UNKEY_ROOT_KEY,
      namespace: "api",
      limit: API_KEY_RATE_LIMIT,
      duration: "60s",
      async: true,
    }),
    ai: new Ratelimit({
      rootKey: UNKEY_ROOT_KEY,
      namespace: "ai",
      limit: 20,
      duration: "1d",
      async: true,
    }),
  };

  async function rateLimit({ rateLimitingType = "core", identifier, opts }: RateLimitHelper) {
    if (isIpInBanListString(identifier)) {
      return await limiter.forcedSlowMode.limit(identifier, opts);
    }

    return await limiter[rateLimitingType].limit(identifier, opts);
  }

  return rateLimit;
}
