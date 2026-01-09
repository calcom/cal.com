import { z } from "zod";

export type TAddClientInputSchemaInput = {
  name: string;
  purpose: string;
  redirectUri: string;
  logo: string;
  websiteUrl?: string;
  enablePkce?: boolean;
};

export type TAddClientInputSchema = {
  name: string;
  purpose: string;
  redirectUri: string;
  logo: string;
  websiteUrl?: string;
  enablePkce: boolean;
};

export const ZAddClientInputSchema: z.ZodType<TAddClientInputSchema, z.ZodTypeDef, TAddClientInputSchemaInput> = z.object({
  name: z.string(),
  purpose: z.string().min(1),
  redirectUri: z.string(),
  logo: z.string(),
  websiteUrl: z.string().url().optional(),
  enablePkce: z.boolean().optional().default(false),
});
