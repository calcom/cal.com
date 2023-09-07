import { z } from "zod";

// maybe I can reuse that from or for formValues
export const ZGenerateAuthCodeInputSchema = z.object({
  clientId: z.string(),
});

export type TGenerateAuthCodeInputSchema = z.infer<typeof ZGenerateAuthCodeInputSchema>;
