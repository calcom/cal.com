import { z } from "zod";

export const ZCalIdAppCredentialsByTypeInputSchema = z.object({
  appType: z.string(),
});

export type TCalIdAppCredentialsByTypeInputSchema = z.infer<typeof ZCalIdAppCredentialsByTypeInputSchema>;
