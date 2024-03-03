import { z } from "zod";

import { minimumTokenResponseSchema } from "@calcom/app-store/_utils/oauth/parseRefreshTokenResponse";

const userId = z.string();
const appSlug = z.string();

export const schemaCredentialGetParams = z.object({
  userId,
  appSlug: appSlug.optional(),
});

export const schemaCredentialPostParams = z.object({
  userId,
});

export const schemaCredentialPostBody = z.object({
  appSlug,
  key: minimumTokenResponseSchema,
});

export const schemaCredentialPatchParams = z.object({
  userId,
  credentialId: z.string(),
});

export const schemaCredentialPatchBody = z.object({
  key: minimumTokenResponseSchema,
});
