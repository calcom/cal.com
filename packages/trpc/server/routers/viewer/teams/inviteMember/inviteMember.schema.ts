import { z } from "zod";

import { MAX_NB_INVITES } from "@calcom/lib/constants";
import { MembershipRole } from "@calcom/prisma/enums";

export const ZInviteMemberInputSchema = z.object({
  teamId: z.number(),
  usernameOrEmail: z
    .union([z.string(), z.array(z.string())])
    .transform((usernameOrEmail) => {
      if (typeof usernameOrEmail === "string") {
        return usernameOrEmail.trim().toLowerCase();
      }
      return usernameOrEmail.map((item) => item.trim().toLowerCase());
    })
    .refine(
      (value) => {
        if (Array.isArray(value)) {
          if (value.length > MAX_NB_INVITES) {
            return false;
          }
        }
        return true;
      },
      { message: `You are limited to inviting a maximum of ${MAX_NB_INVITES} users at once.` }
    )
    .refine(
      (value) => {
        if (Array.isArray(value)) {
          return !value.some((email) => !z.string().email().safeParse(email).success);
        }
        return true;
      },
      { message: "Bulk invitations are restricted to email addresses only." }
    ),
  role: z.nativeEnum(MembershipRole),
  language: z.string(),
  isOrg: z.boolean().default(false),
});

export type TInviteMemberInputSchema = z.infer<typeof ZInviteMemberInputSchema>;
