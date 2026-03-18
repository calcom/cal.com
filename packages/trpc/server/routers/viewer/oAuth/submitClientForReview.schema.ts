import { MAX_REDIRECT_URIS } from "@calcom/features/oauth/utils/validateRedirectUris";
import { AccessScopeSchema } from "@calcom/prisma/zod/inputTypeSchemas";
import { z } from "zod";

export const ZSubmitClientInputSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  purpose: z.string().min(1, "Purpose is required"),
  redirectUris: z.array(z.string().min(1)).min(1).max(MAX_REDIRECT_URIS),
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

export const ZSubmitClientOutputSchema = z.object({
  clientId: z.string(),
  name: z.string(),
  purpose: z.string().nullable(),
  clientSecret: z.string().optional(),
  redirectUris: z.array(z.string()),
  logo: z.string().nullable(),
  clientType: z.string(),
  status: z.string(),
  isPkceEnabled: z.boolean().optional(),
});

export type TSubmitClientInputSchema = z.infer<typeof ZSubmitClientInputSchema>;

export type TSubmitClientOutputSchema = z.infer<typeof ZSubmitClientOutputSchema>;
