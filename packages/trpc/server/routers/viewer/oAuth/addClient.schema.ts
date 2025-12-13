import { z } from "zod";

export type TAddClientInputSchema = {
  name: string;
  redirectUri: string;
  logo: string;
  enablePkce?: boolean;
};

export const ZAddClientInputSchema: z.ZodType<TAddClientInputSchema> = z.object({
  name: z.string(),
  redirectUri: z.string(),
  logo: z.string(),
  enablePkce: z.boolean().optional().default(false),
});
