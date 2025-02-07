import z from "zod";

export const hitpayCredentialKeysSchema = z.object({
  prod: z
    .object({
      apiKey: z.string(),
      saltKey: z.string(),
    })
    .optional(),
  sandbox: z
    .object({
      apiKey: z.string(),
      saltKey: z.string(),
    })
    .optional(),
  isSandbox: z.boolean(),
});
