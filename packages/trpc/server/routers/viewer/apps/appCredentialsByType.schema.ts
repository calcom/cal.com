import { z } from "zod";

export const ZAppCredentialsByTypeInputSchema = z.object({
  appType: z.string(),
});

export type TAppCredentialsByTypeInputSchema = z.infer<typeof ZAppCredentialsByTypeInputSchema>;
