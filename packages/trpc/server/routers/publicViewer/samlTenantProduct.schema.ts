import { z } from "zod";

import { emailSchema } from "@calcom/lib/emailSchema";

export type TSamlTenantProductInputSchema = {
  email: string;
};

export const ZSamlTenantProductInputSchema = z.object({
  email: emailSchema,
});
