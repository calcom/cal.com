import type { NextMiddleware } from "next-api-middleware";

import { handleAutoLock } from "@calcom/lib/autoLock";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";

export const rateLimitApiKey: NextMiddleware = async (req, res, next) => {
  if (!req.query.apiKey) return res.status(401).json({ message: "No apiKey provided" });

  // TODO: Add a way to add trusted api keys
  try {
    await checkRateLimitAndThrowError({
      identifier: req.query.apiKey as string,
      rateLimitingType: "api",
      onRateLimiterResponse: async (response) => {
        res.setHeader("X-RateLimit-Limit", response.limit);
        res.setHeader("X-RateLimit-Remaining", response.remaining);
        res.setHeader("X-RateLimit-Reset", response.reset);

        const didLock = await handleAutoLock({
          identifier: req.query.apiKey,
          identifierType: "apiKey",
          rateLimitResponse: response,
        });

        if (didLock) {
          throw new HttpError({
            statusCode: 429,
            message: "Too many requests",
          });
        }
      },
    });
  } catch (error) {
    res.status(429).json({ message: "Rate limit exceeded" });
  }

  await next();
};
