import { z } from "zod";

import { emailSchema } from "@calcom/lib/emailSchema";

export type TSamlTenantProductInputSchema = {
  email: string;
};

export const ZSamlTenantProductInputSchema: z.ZodType<TSamlTenantProductInputSchema> = z.object({
  email: emailSchema,
});
