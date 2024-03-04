import { z } from "zod";

const userId = z.string();
const appSlug = z.string();
const credentialId = z.string();
const encryptedKey = z.string();

export const schemaCredentialGetParams = z.object({
  userId,
  appSlug: appSlug.optional(),
});

export const schemaCredentialPostParams = z.object({
  userId,
});

export const schemaCredentialPostBody = z.object({
  appSlug,
  encryptedKey,
});

export const schemaCredentialPatchParams = z.object({
  userId,
  credentialId,
});

export const schemaCredentialPatchBody = z.object({
  encryptedKey,
});

export const schemaCredentialDeleteParams = z.object({
  userId,
  credentialId,
});
