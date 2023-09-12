import { z } from "zod";

export const ZUpdateAppCredentialsInputSchema = z.object({
  credentialId: z.number(),
  key: z.object({}).passthrough(),
});

export type TUpdateAppCredentialsInputSchema = z.infer<typeof ZUpdateAppCredentialsInputSchema>;
