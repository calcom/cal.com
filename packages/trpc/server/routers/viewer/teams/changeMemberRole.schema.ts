import { z } from "zod";

import { MembershipRole } from "@calcom/prisma/enums";

export const ZChangeMemberRoleInputSchema = z.object({
  teamId: z.number(),
  memberId: z.number(),
  role: z.nativeEnum(MembershipRole),
});

export type TChangeMemberRoleInputSchema = z.infer<typeof ZChangeMemberRoleInputSchema>;
