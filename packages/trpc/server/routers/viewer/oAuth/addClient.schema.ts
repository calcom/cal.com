import { z } from "zod";

export const ZAddClientInputSchema = z.object({
  name: z.string(),
  redirectUri: z.string(),
  logo: z.string(),
  enablePkce: z.boolean().optional().default(false),
});

export type TAddClientInputSchema = z.infer<typeof ZAddClientInputSchema>;
