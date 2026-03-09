import { AccessScopeSchema } from "@calcom/prisma/zod/inputTypeSchemas";
import { z } from "zod";

export type TCreateClientInputSchemaInput = {
  name: string;
  purpose: string;
  redirectUri: string;
  logo?: string;
  websiteUrl?: string;
  enablePkce?: boolean;
  scopes: z.infer<typeof AccessScopeSchema>[];
};

export type TCreateClientInputSchema = {
  name: string;
  purpose: string;
  redirectUri: string;
  logo?: string;
  websiteUrl?: string;
  enablePkce: boolean;
  scopes: z.infer<typeof AccessScopeSchema>[];
};

export const ZCreateClientInputSchema: z.ZodType<
  TCreateClientInputSchema,
  z.ZodTypeDef,
  TCreateClientInputSchemaInput
> = z.object({
  name: z.string(),
  purpose: z.string().min(1),
  redirectUri: z.string(),
  logo: z
    .string()
    .optional()
    .transform((value) => (typeof value === "string" && value.trim() === "" ? undefined : value)),
  websiteUrl: z
    .union([z.literal(""), z.string().url("Must be a valid URL")])
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  enablePkce: z.boolean().optional().default(false),
  scopes: z.array(AccessScopeSchema).min(1, "At least one scope is required"),
});
