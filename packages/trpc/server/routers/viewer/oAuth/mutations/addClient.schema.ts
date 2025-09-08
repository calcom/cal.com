import { z } from "zod";

export const ZAddClientInputSchema = z.object({
  name: z.string(),
  redirectUri: z.string(),
  logo: z.string(),
});

export type TAddClientInputSchema = z.infer<typeof ZAddClientInputSchema>;
