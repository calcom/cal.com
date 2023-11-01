import type { NextMiddleware } from "next-api-middleware";

import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";

export const rateLimitApiKey: NextMiddleware = async (req, res, next) => {
  if (!req.query.apiKey) return res.status(401).json({ message: "No apiKey provided" });

  // TODO: Add a way to add trusted api keys
  await checkRateLimitAndThrowError({
    identifier: req.query.apiKey as string,
    rateLimitingType: "api",
  });

  await next();
};
