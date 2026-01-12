import { z } from "zod";

export const ZSubmitClientInputSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  purpose: z.string().min(1, "Purpose is required"),
  redirectUri: z.string().url("Must be a valid URL"),
  logo: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().optional()
  ),
  websiteUrl: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().url("Must be a valid URL").optional()
  ),
  enablePkce: z.boolean().optional().default(false),
});

export const ZSubmitClientOutputSchema = z.object({
  clientId: z.string(),
  name: z.string(),
  purpose: z.string(),
  clientSecret: z.string().optional(),
  redirectUri: z.string(),
  logo: z.string().nullable(),
  clientType: z.string(),
  approvalStatus: z.string(),
  isPkceEnabled: z.boolean().optional(),
});

export type TSubmitClientInputSchema = z.infer<typeof ZSubmitClientInputSchema>;

export type TSubmitClientOutputSchema = z.infer<typeof ZSubmitClientOutputSchema>;
