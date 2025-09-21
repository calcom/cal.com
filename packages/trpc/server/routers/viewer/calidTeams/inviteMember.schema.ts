import { z } from "zod";

import { MAX_NB_INVITES } from "@calcom/lib/constants";
import { emailSchema } from "@calcom/lib/emailSchema";
import { MembershipRole } from "@calcom/prisma/enums";

export const ZInviteMemberSchema = z.object({
  language: z.string(),
  teamId: z.number(),
  token: z.string().optional(),
  usernameOrEmail: z
    .union([
      z.string(),
      z
        .union([
          z.string(),
          z.object({
            email: emailSchema,
            role: z.nativeEnum(MembershipRole),
          }),
        ])
        .array(),
    ])
    .optional()
    .transform((usernameOrEmail) => {
      if (!usernameOrEmail) return undefined;
      if (typeof usernameOrEmail === "string") {
        return usernameOrEmail.trim().toLowerCase();
      }
      return usernameOrEmail.map((item) => {
        if (typeof item === "string") {
          return item.trim().toLowerCase();
        }

        return {
          ...item,
          email: item.email.trim().toLowerCase(),
        };
      });
    })
    .refine(
      (value) => {
        if (!value) return true;
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
        if (!value) return true;
        if (Array.isArray(value)) {
          return !value.some((email) => !emailSchema.safeParse(email).success);
        }
        return true;
      },
      { message: "Bulk invitations are restricted to email addresses only." }
    ),
  role: z.nativeEnum(MembershipRole).optional(),
});

export type ZInviteMemberInput = z.infer<typeof ZInviteMemberSchema>;
