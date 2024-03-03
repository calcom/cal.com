import { z } from "zod";

import { minimumTokenResponseSchema } from "@calcom/app-store/_utils/oauth/parseRefreshTokenResponse";

export const schemaCredentialGetParams = z.object({
  userId: z.string(),
  appSlug: z.string().optional(),
});

export const schemaCredentialPostParams = z.object({
  userId: z.string(),
});

export const schemaCredentialPostBody = z.object({
  appSlug: z.string().optional(),
  key: minimumTokenResponseSchema,
});

export const schemaCredentialPutParams = z.object({
  userId: z.string(),
  credentialId: z.string(),
  key: minimumTokenResponseSchema,
});
