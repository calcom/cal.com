import z from "zod";

export const hitpayCredentialKeysSchema = z.object({
  api_key: z.string(),
  salt_key: z.string(),
});
