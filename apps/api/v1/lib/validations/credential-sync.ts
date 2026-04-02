import { HttpError } from "@calcom/lib/http-error";
import { z } from "zod";

const userId = z.string().transform((val) => {
  const userIdInt = parseInt(val);

  if (isNaN(userIdInt)) {
    throw new HttpError({ message: "userId is not a valid number", statusCode: 400 });
  }

  return userIdInt;
});
const appSlug = z.string();
const credentialId = z.string().transform((val) => {
  const credentialIdInt = parseInt(val);

  if (isNaN(credentialIdInt)) {
    throw new HttpError({ message: "credentialId is not a valid number", statusCode: 400 });
  }

  return credentialIdInt;
});
const encryptedKey = z.string();

export const schemaCredentialGetParams = z.object({
  userId,
  appSlug: appSlug.optional(),
});

export const schemaCredentialPostParams = z.object({
  userId,
  createSelectedCalendar: z
    .string()
    .optional()
    .transform((val) => {
      return val === "true";
    }),
  createDestinationCalendar: z
    .string()
    .optional()
    .transform((val) => {
      return val === "true";
    }),
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
