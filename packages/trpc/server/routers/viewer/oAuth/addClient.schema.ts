import { z } from "zod";

export const ZAddClientInputSchema = z.object({
  name: z.string(),
  redirectUri: z.string(),
  logo: z.string(),
  websiteUrl: z.string().url().optional(),
  enablePkce: z.boolean().optional().default(false),
});

export type TAddClientInputSchema = z.infer<typeof ZAddClientInputSchema>;
