import type { NextMiddleware } from "next-api-middleware";

import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";

export const rateLimitApiKey: NextMiddleware = async (req, res, next) => {
  if (!req.query.apiKey) return res.status(401).json({ message: "No apiKey provided" });

  // TODO: Add a way to add trusted api keys
  try {
    await checkRateLimitAndThrowError({
      identifier: req.query.apiKey as string,
      rateLimitingType: "api",
      onRateLimiterResponse: (response) => {
        res.setHeader("X-RateLimit-Limit", response.limit);
        res.setHeader("X-RateLimit-Remaining", response.remaining);
        res.setHeader("X-RateLimit-Reset", response.reset);
      },
    });
  } catch (error) {
    res.status(429).json({ message: "Rate limit exceeded" });
  }

  await next();
};
