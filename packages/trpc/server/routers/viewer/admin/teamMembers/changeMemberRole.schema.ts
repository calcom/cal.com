import { z } from "zod";

import { MembershipRole } from "@calcom/prisma/enums";

export const ZChangeMemberRoleInputSchema = z.object({
  membershipId: z.number(),
  role: z.nativeEnum(MembershipRole),
});

export type TChangeMemberRoleInputSchema = z.infer<typeof ZChangeMemberRoleInputSchema>;
