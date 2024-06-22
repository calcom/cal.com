import { z } from "zod";

import { emailRegex } from "@calcom/prisma/zod-utils";

export const ZSamlTenantProductInputSchema = z.object({
  email: z.string().regex(emailRegex),
});

export type TSamlTenantProductInputSchema = z.infer<typeof ZSamlTenantProductInputSchema>;
