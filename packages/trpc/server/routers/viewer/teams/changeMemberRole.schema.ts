import { z } from "zod";

import { MembershipRole } from "@calcom/prisma/enums";

export const ZChangeMemberRoleInputSchema = z.object({
  teamId: z.number(),
  memberId: z.number(),
  role: z.union([z.nativeEnum(MembershipRole), z.string()]), // Support both traditional roles and custom role IDs
});

export type TChangeMemberRoleInputSchema = z.infer<typeof ZChangeMemberRoleInputSchema>;
