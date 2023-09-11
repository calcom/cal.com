import { z } from "zod";

// maybe I can reuse that from or for formValues
export const ZGenerateAuthCodeInputSchema = z.object({
  clientId: z.string(),
  scopes: z.array(z.string()),
});

export type TGenerateAuthCodeInputSchema = z.infer<typeof ZGenerateAuthCodeInputSchema>;
