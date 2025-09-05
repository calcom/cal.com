import { emailSchema } from "@calcom/lib/emailSchema";
import { z } from "zod";

export const ZSamlTenantProductInputSchema = z.object({
  email: emailSchema,
});

export type TSamlTenantProductInputSchema = z.infer<typeof ZSamlTenantProductInputSchema>;
