import { withValidation } from "next-validations";

import { _ApiKeyModel as ApiKey } from "@calcom/prisma/zod";

export const schemaApiKeyBodyParams = ApiKey.omit({ id: true, userId: true, createdAt: true });

export const schemaApiKeyPublic = ApiKey.omit({
  id: true,
  userId: true,
});

export const withValidApiKey = withValidation({
  schema: schemaApiKeyBodyParams,
  type: "Zod",
  mode: "body",
});
