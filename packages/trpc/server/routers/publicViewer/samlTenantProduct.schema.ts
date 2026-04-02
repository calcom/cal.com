import { emailSchema } from "@calcom/lib/emailSchema";
import { z } from "zod";

export type TSamlTenantProductInputSchema = {
  email: string;
};

export const ZSamlTenantProductInputSchema: z.ZodType<TSamlTenantProductInputSchema> = z.object({
  email: emailSchema,
});
