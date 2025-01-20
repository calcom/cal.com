import type { NextMiddleware } from "next-api-middleware";

import { handleAutoLock } from "@calcom/lib/autoLock";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { HttpError } from "@calcom/lib/http-error";

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

        try {
          const didLock = await handleAutoLock({
            identifier: req.query.apiKey as string, // Casting as this is verified in another middleware
            identifierType: "apiKey",
            rateLimitResponse: response,
          });

          if (didLock) {
            return res.status(429).json({ message: "Too many requests" });
          }
        } catch (error) {
          if (error instanceof Error && error.message === "No user found for this API key.") {
            return res.status(401).json({ message: error.message });
          }
          throw error;
        }
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return res.status(429).json({ message: "Rate limit exceeded" });
  }

  await next();
};
