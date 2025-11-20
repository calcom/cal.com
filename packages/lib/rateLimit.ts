import { Unkey } from "@unkey/api";
import * as errors from "@unkey/api/models/errors";

import { isIpInBanListString } from "./getIP";
import logger from "./logger";

const log = logger.getSubLogger({ prefix: ["RateLimit"] });

export const API_KEY_RATE_LIMIT = 30;

const configs = {
  core: {
    limit: 10,
    duration: 60 * 1000, // 60m
  },
  instantMeeting: {
    limit: 1,
    duration: 10 * 60 * 1000, // 10m
  },
  common: {
    limit: 200,
    duration: 60 * 1000, // 60s
  },
  forcedSlowMode: {
    limit: 1,
    duration: 30 * 1000, // 30s
  },
  api: {
    limit: API_KEY_RATE_LIMIT,
    duration: 60 * 1000, // 60s
  },
  ai: {
    limit: 20,
    duration: 24 * 60 * 60 * 1000, // 1d
  },
  sms: {
    limit: 50,
    duration: 5 * 60 * 1000, // 5m
  },
  smsMonth: {
    limit: 250,
    duration: 30 * 24 * 60 * 60 * 1000, // 30d
  },
} as const;

export type RateLimitHelper = {
  // defaults to "core"
  rateLimitingType?: keyof typeof configs;
  identifier: string;
  // Override limit or duration
  opts?: {
    limit?: number;

    // milliseconds
    duration?: number;
  };
  /**
   * Using a callback instead of a regular return to provide headers even
   * when the rate limit is reached and an error is thrown.
   **/
  onRateLimiterResponse?: (response: RatelimitResponse) => void;
};

// I couldn't quite get the import from @unkey/api/models/components to work, so I copied it here
export type RatelimitResponse = {
  passed: boolean;
  limits: {
    namespace: string;
    identifier: string;
    passed: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }[];
};

export function rateLimiter(): (
  ...reqs: RateLimitHelper[]
) => RatelimitResponse | Promise<RatelimitResponse> {
  const { UNKEY_ROOT_KEY } = process.env;

  if (!UNKEY_ROOT_KEY) {
    log.warn("Disabled because the UNKEY_ROOT_KEY environment variable was not found.");
    return () => ({
      passed: true,
      limits: [{ namespace: "core", identifier: "", passed: true, limit: 10, remaining: 999, reset: 0 }],
    });
  }

  const unkey = new Unkey({
    rootKey: UNKEY_ROOT_KEY,
    timeoutMs: 5000,
    retryConfig: {
      strategy: "backoff",
      backoff: {
        initialInterval: 10,
        maxInterval: 100,
        exponent: 1.5,
        maxElapsedTime: 500,
      },
      retryConnectionErrors: true,
    },
  });

  return async function rateLimit(...reqs: RateLimitHelper[]): Promise<RatelimitResponse> {
    try {
      if (reqs.length === 0) {
        return {
          passed: true,
          limits: [],
        };
      }

      // If any of the identifiers is on the ban list, we do a single forced-slow-mode check
      for (const req of reqs) {
        if (isIpInBanListString(req.identifier)) {
          return await unkey.ratelimit
            .multiLimit([
              {
                namespace: "forcedSlowMode",
                limit: req.opts?.limit ?? configs.forcedSlowMode.limit,
                duration: req.opts?.duration ?? configs.forcedSlowMode.duration,
                identifier: req.identifier,
              },
            ])
            .then((res) => res.data);
        }
      }

      return await unkey.ratelimit
        .multiLimit(
          reqs.map((req) => {
            const namespace = req.rateLimitingType ?? "core";
            return {
              namespace,
              limit: req.opts?.limit ?? configs[namespace].limit,
              duration: req.opts?.duration ?? configs[namespace].duration,
              identifier: req.identifier,
            };
          })
        )
        .then((res) => res.data);
    } catch (err: unknown) {
      if (err instanceof errors.UnkeyError) {
        log.error("Unkey rate limiter encountered a known error", {
          error: err.message,
          stack: err.stack,
          status: err.statusCode,
          body: err.body, // contains request ids and hints on how to fix the issue
          identifiers: reqs.map((req) => req.identifier),
          timestamp: new Date().toISOString(),
        });
      } else if (err instanceof Error) {
        log.error("Unkey rate limiter encountered unknown error", {
          error: err.message,
          stack: err.stack,
          identifiers: reqs.map((req) => req.identifier),
          timestamp: new Date().toISOString(),
        });
      } else {
        // should never happen but typescript was sad
        log.error("Unkey rate limiter encountered something other than an error", {
          error: err,
          identifiers: reqs.map((req) => req.identifier),
          timestamp: new Date().toISOString(),
        });
      }

      // This is the fallback response in case of an error or timeout.
      return {
        passed: true,
        limits: [],
      };
    }
  };
}
