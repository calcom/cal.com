import { withValidation } from "next-validations";
import { z } from "zod";

import { _ApiKeyModel as ApiKey } from "@calcom/prisma/zod";

export const schemaApiKeyBaseBodyParams = ApiKey.omit({ id: true, userId: true, createdAt: true }).partial();

const schemaApiKeyRequiredParams = z.object({
  email: z.string().email(),
});

export const schemaApiKeyBodyParams = schemaApiKeyBaseBodyParams.merge(schemaApiKeyRequiredParams);

export const schemaApiKeyPublic = ApiKey.omit({
  id: true,
  userId: true,
});

export const withValidApiKey = withValidation({
  schema: schemaApiKeyBodyParams,
  type: "Zod",
  mode: "body",
});
