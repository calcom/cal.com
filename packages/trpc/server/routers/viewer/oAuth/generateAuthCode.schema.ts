import { z } from "zod";

export const ZGenerateAuthCodeInputSchema = z.object({
  clientId: z.string(),
  scopes: z.array(z.string()),
});

export type TGenerateAuthCodeInputSchema = z.infer<typeof ZGenerateAuthCodeInputSchema>;
