/* eslint-disable @typescript-eslint/no-explicit-any */
import cache from "memory-cache";

import { ErrorCode } from "./auth";

const rateLimit = (options: { interval: number }) => {
  return {
    check: (requestLimit: number, uniqueIdentifier: string) => {
      const tokenCount = cache.get(token) || [0];
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
