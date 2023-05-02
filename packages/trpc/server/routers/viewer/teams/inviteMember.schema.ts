import { z } from "zod";

import { MembershipRole } from "@calcom/prisma/enums";

export const ZInviteMemberInputSchema = z.object({
  teamId: z.number(),
  usernameOrEmail: z.string().transform((usernameOrEmail) => usernameOrEmail.toLowerCase()),
  role: z.nativeEnum(MembershipRole),
  language: z.string(),
  sendEmailInvitation: z.boolean(),
});

export type TInviteMemberInputSchema = z.infer<typeof ZInviteMemberInputSchema>;
