import { z } from "zod";

export type TAddClientInputSchemaInput = {
  name: string;
  redirectUri: string;
  logo: string;
  websiteUrl?: string;
  enablePkce?: boolean;
};

export type TAddClientInputSchema = {
  name: string;
  redirectUri: string;
  logo: string;
  websiteUrl?: string;
  enablePkce: boolean;
};

export const ZAddClientInputSchema: z.ZodType<TAddClientInputSchema, z.ZodTypeDef, TAddClientInputSchemaInput> = z.object({
  name: z.string(),
  redirectUri: z.string(),
  logo: z.string(),
  websiteUrl: z.string().url().optional(),
  enablePkce: z.boolean().optional().default(false),
});
