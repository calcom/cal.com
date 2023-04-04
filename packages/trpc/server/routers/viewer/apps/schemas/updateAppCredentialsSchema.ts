import { object, number } from "zod";

export const updateAppCredentialsSchema = object({
  credentialId: number(),
  key: object({}).passthrough(),
});
