import { z } from "zod";

import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

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
    .refine((value) => {
      let invalidEmail;
      if (Array.isArray(value)) {
        if (value.length > 100) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `You are limited to inviting a maximum of 100 users at once.`,
          });
        }
        invalidEmail = value.find((email) => !z.string().email().safeParse(email).success);
      } else {
        invalidEmail = !z.string().email().safeParse(value).success ? value : null;
      }
      if (invalidEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invite failed because '${invalidEmail}' is not a valid email address`,
        });
      }
      return true;
    }),
  role: z.nativeEnum(MembershipRole),
  language: z.string(),
  isOrg: z.boolean().default(false),
});

export type TInviteMemberInputSchema = z.infer<typeof ZInviteMemberInputSchema>;
