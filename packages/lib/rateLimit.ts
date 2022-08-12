/* eslint-disable @typescript-eslint/no-explicit-any */
import cache from "memory-cache";

const rateLimit = (options: { uniqueTokenPerInterval: any; interval: any }) => {
  return {
    check: (limit: number, token: unknown) => {
      const tokenCount: any = cache.get(token) || [0];
      if (tokenCount[0] === 0) {
        cache.put(token, tokenCount, options.interval);
      }
      tokenCount[0] += 1;

      const currentUsage = tokenCount[0];
      const isRateLimited = currentUsage >= options.uniqueTokenPerInterval || limit;

      return { isRateLimited, limit, remaining: isRateLimited ? 0 : limit - currentUsage };
    },
  };
};

export default rateLimit;
