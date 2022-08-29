/* eslint-disable @typescript-eslint/no-explicit-any */
import cache from "memory-cache";

import { ErrorCode } from "@calcom/lib/auth";

const rateLimit = (options: { interval: number }) => {
  return {
    check: (limit: number, token: unknown) => {
      const tokenCount: any = cache.get(token) || [0];
      if (tokenCount[0] === 0) {
        cache.put(token, tokenCount, options.interval);
      }
      tokenCount[0] += 1;

      const currentUsage = tokenCount[0];
      const isRateLimited = currentUsage >= limit;

      if (isRateLimited) {
        throw new Error(ErrorCode.RateLimitExceeded);
      }

      return { isRateLimited, limit, remaining: isRateLimited ? 0 : limit - currentUsage };
    },
  };
};

export default rateLimit;
