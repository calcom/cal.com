import { z } from "zod";

import { CalIdMembershipRole } from "@calcom/prisma/enums";

export const ZChangeCalidMemberRoleInputSchema = z.object({
  teamId: z.number(),
  memberId: z.number(),
  role: z.nativeEnum(CalIdMembershipRole),
});

export type ZChangeCalidMemberRoleInput = z.infer<typeof ZChangeCalidMemberRoleInputSchema>;
