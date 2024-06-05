import { z } from "zod";

export const ZSamlTenantProductInputSchema = z.object({
  email: z.string().email(),
  token: z.string(),
});

export type TSamlTenantProductInputSchema = z.infer<typeof ZSamlTenantProductInputSchema>;
