import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";

import { sendTeamInviteEmail } from "@calcom/emails";
import { updateQuantitySubscriptionFromStripe } from "@calcom/features/ee/teams/lib/payments";
import { IS_TEAM_BILLING_ENABLED, WEBAPP_URL } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/lib/server/i18n";
import { isTeamAdmin, isTeamOwner } from "@calcom/lib/server/queries/teams";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TInviteMemberInputSchema } from "./inviteMember.schema";
import { isEmail } from "./util";

type InviteMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TInviteMemberInputSchema;
};

export const inviteMemberHandler = async ({ ctx, input }: InviteMemberOptions) => {
  if (!(await isTeamAdmin(ctx.user?.id, input.teamId))) throw new TRPCError({ code: "UNAUTHORIZED" });
  if (input.role === MembershipRole.OWNER && !(await isTeamOwner(ctx.user?.id, input.teamId)))
    throw new TRPCError({ code: "UNAUTHORIZED" });

  const translation = await getTranslation(input.language ?? "en", "common");

  const team = await prisma.team.findFirst({
    where: {
      id: input.teamId,
    },
  });

  if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });

  const emailsToInvite = Array.isArray(input.usernameOrEmail)
    ? input.usernameOrEmail
    : [input.usernameOrEmail];

  emailsToInvite.forEach(async (usernameOrEmail) => {
    const invitee = await prisma.user.findFirst({
      where: {
        OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
      },
    });

    if (!invitee) {
      // liberal email match

      if (!isEmail(usernameOrEmail))
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Invite failed because there is no corresponding user for ${usernameOrEmail}`,
        });

      // valid email given, create User and add to team
      await prisma.user.create({
        data: {
          email: usernameOrEmail,
          invitedTo: input.teamId,
          teams: {
            create: {
              teamId: input.teamId,
              role: input.role as MembershipRole,
            },
          },
        },
      });

      const token: string = randomBytes(32).toString("hex");

      await prisma.verificationToken.create({
        data: {
          identifier: usernameOrEmail,
          token,
          expires: new Date(new Date().setHours(168)), // +1 week
        },
      });
      if (ctx?.user?.name && team?.name) {
        await sendTeamInviteEmail({
          language: translation,
          from: ctx.user.name,
          to: usernameOrEmail,
          teamName: team.name,
          joinLink: `${WEBAPP_URL}/signup?token=${token}&callbackUrl=/getting-started`, // we know that the user has not completed onboarding yet, so we can redirect them to the onboarding flow
          isCalcomMember: false,
        });
      }
    } else {
      // create provisional membership
      try {
        await prisma.membership.create({
          data: {
            teamId: input.teamId,
            userId: invitee.id,
            role: input.role as MembershipRole,
          },
        });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
          // Don't throw an error if the user is already a member of the team when inviting multiple users
          if (!Array.isArray(input.usernameOrEmail) && e.code === "P2002") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "This user is a member of this team / has a pending invitation.",
            });
          } else {
            console.log(`User ${invitee.id} is already a member of this team.`);
          }
        } else throw e;
      }

      let sendTo = usernameOrEmail;
      if (!isEmail(usernameOrEmail)) {
        sendTo = invitee.email;
      }
      // inform user of membership by email
      if (input.sendEmailInvitation && ctx?.user?.name && team?.name) {
        const inviteTeamOptions = {
          joinLink: `${WEBAPP_URL}/auth/login?callbackUrl=/settings/teams`,
          isCalcomMember: true,
        };
        /**
         * Here we want to redirect to a differnt place if onboarding has been completed or not. This prevents the flash of going to teams -> Then to onboarding - also show a differnt email template.
         * This only changes if the user is a CAL user and has not completed onboarding and has no password
         */
        if (!invitee.completedOnboarding && !invitee.password && invitee.identityProvider === "CAL") {
          const token = randomBytes(32).toString("hex");
          await prisma.verificationToken.create({
            data: {
              identifier: usernameOrEmail,
              token,
              expires: new Date(new Date().setHours(168)), // +1 week
            },
          });

          inviteTeamOptions.joinLink = `${WEBAPP_URL}/signup?token=${token}&callbackUrl=/getting-started`;
          inviteTeamOptions.isCalcomMember = false;
        }

        await sendTeamInviteEmail({
          language: translation,
          from: ctx.user.name,
          to: sendTo,
          teamName: team.name,
          ...inviteTeamOptions,
        });
      }
    }
  });
  if (IS_TEAM_BILLING_ENABLED) await updateQuantitySubscriptionFromStripe(input.teamId);
  return input;
};
