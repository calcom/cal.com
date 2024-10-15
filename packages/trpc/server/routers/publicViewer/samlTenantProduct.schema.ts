import { z } from "zod";

import { emailSchema } from "@calcom/lib/emailSchema";

export const ZSamlTenantProductInputSchema = z.object({
  email: emailSchema,
});

export type TSamlTenantProductInputSchema = z.infer<typeof ZSamlTenantProductInputSchema>;
