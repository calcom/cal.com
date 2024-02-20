import type { NextMiddleware } from "next-api-middleware";

import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { API_KEY_RATE_LIMIT } from "@calcom/lib/rateLimit";

export const rateLimitApiKey: NextMiddleware = async (req, res, next) => {
  if (!req.query.apiKey) return res.status(401).json({ message: "No apiKey provided" });

  // TODO: Add a way to add trusted api keys
  await checkRateLimitAndThrowError({
    identifier: req.query.apiKey as string,
    rateLimitingType: "api",
    onRateLimiterResponse: (response) => {
      res.setHeader("X-RateLimit-Limit", API_KEY_RATE_LIMIT);
      res.setHeader("X-RateLimit-Remaining", response.remaining);
      res.setHeader("X-RateLimit-Reset", response.reset);
    },
  });

  await next();
};
