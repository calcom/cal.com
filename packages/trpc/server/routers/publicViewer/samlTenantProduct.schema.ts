import { z } from "zod";

export const ZSamlTenantProductInputSchema = z.object({
  email: z.string().email(),
});

export type TSamlTenantProductInputSchema = z.infer<typeof ZSamlTenantProductInputSchema>;
