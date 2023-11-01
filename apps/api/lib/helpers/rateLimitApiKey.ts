import type { NextMiddleware } from "next-api-middleware";

import { apiKeySchema } from "@calcom/features/ee/api-keys/lib/apiKeys";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { HttpError } from "@calcom/lib/http-error";

export const rateLimitApiKey: NextMiddleware = async (req, _res, next) => {
  const result = apiKeySchema.safeParse(req.query.apiKey);
  // Use basic parsing of the API key to ensure we don't rate limit needlessly
  if (!result.success) {
    throw new HttpError({ statusCode: 401, message: result.error.issues[0].message });
  }
  // TODO: Add a way to add trusted api keys
  await checkRateLimitAndThrowError({
    identifier: result.data,
    rateLimitingType: "api",
  });

  await next();
};
