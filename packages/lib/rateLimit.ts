/* eslint-disable @typescript-eslint/no-explicit-any */
import cache from "memory-cache";

import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";

const rateLimit = (options: { intervalInMs: number }) => {
  return {
    check: (requestLimit: number, uniqueIdentifier: string) => {
      const count = cache.get(uniqueIdentifier) || [0];
      if (count[0] === 0) {
        cache.put(uniqueIdentifier, count, options.intervalInMs);
      }
      count[0] += 1;

      const currentUsage = count[0];
      const isRateLimited = currentUsage >= requestLimit;

      if (isRateLimited) {
        throw new Error(ErrorCode.RateLimitExceeded);
      }

      return { isRateLimited, requestLimit, remaining: isRateLimited ? 0 : requestLimit - currentUsage };
    },
  };
};

export default rateLimit;
