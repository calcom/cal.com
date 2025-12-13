import { z } from "zod";

import { PolicyType } from "@calcom/prisma/enums";

export const ZAcceptPolicySchema = z.object({
  type: z.nativeEnum(PolicyType),
  version: z.coerce.date(),
});

export type TAcceptPolicySchema = z.infer<typeof ZAcceptPolicySchema>;
