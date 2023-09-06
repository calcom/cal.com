import { z } from "zod";

// maybe I can reuse that from or for formValues
export const ZAddClientInputSchema = z.object({
  name: z.string(),
  redirectUri: z.string(),
});

export type TAddClientInputSchema = z.infer<typeof ZAddClientInputSchema>;
