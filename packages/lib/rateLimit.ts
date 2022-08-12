/* eslint-disable @typescript-eslint/no-explicit-any */
import LRU from "lru-cache";

const rateLimit = (options: { uniqueTokenPerInterval: any; interval: any }) => {
  const tokenCache = new LRU({
    max: parseInt(options.uniqueTokenPerInterval || 500, 10),
    maxAge: parseInt(options.interval || 60000, 10),
  });

  return {
    check: (limit: number, token: unknown) => {
      const tokenCount: any = tokenCache.get(token) || [0];
      if (tokenCount[0] === 0) {
        tokenCache.set(token, tokenCount);
      }
      tokenCount[0] += 1;

      const currentUsage = tokenCount[0];
      const isRateLimited = currentUsage >= limit;

      return { isRateLimited, limit, remaining: isRateLimited ? 0 : limit - currentUsage };
    },
  };
};

export default rateLimit;
