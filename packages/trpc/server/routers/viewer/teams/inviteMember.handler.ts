import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import type { TFunction } from "next-i18next";

import { sendTeamInviteEmail } from "@calcom/emails";
import { updateQuantitySubscriptionFromStripe } from "@calcom/features/ee/teams/lib/payments";
import { IS_TEAM_BILLING_ENABLED, WEBAPP_URL } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/lib/server/i18n";
import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { isTeamAdmin } from "@calcom/lib/server/queries/teams";
import { prisma } from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import type { MembershipRole } from "@calcom/prisma/enums";
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

async function checkPermissions(userId: number, teamId: number, isOrg?: boolean) {
  if (isOrg) {
    if (!(await isOrganisationAdmin(userId, teamId))) throw new TRPCError({ code: "UNAUTHORIZED" });
  } else {
    if (!(await isTeamAdmin(userId, teamId))) throw new TRPCError({ code: "UNAUTHORIZED" });
  }
}

async function getTeamOrThrow(teamId: number, isOrg?: boolean) {
  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
    },
  });

  if (!team)
    throw new TRPCError({ code: "NOT_FOUND", message: `${isOrg ? "Organization" : "Team"} not found` });
  return team;
}

async function getEmailsToInvite(usernameOrEmail: string | string[]) {
  const emailsToInvite = Array.isArray(usernameOrEmail) ? usernameOrEmail : [usernameOrEmail];

  if (emailsToInvite.length === 0)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You must provide at least one email address to invite.",
    });

  return emailsToInvite;
}

async function getUserToInviteOrThrowIfExists(usernameOrEmail: string, orgId: number, isOrg?: boolean) {
  // Check if user exists in ORG or exists all together
  const invitee = await prisma.user.findFirst({
    where: {
      OR: [{ username: usernameOrEmail, organizationId: orgId }, { email: usernameOrEmail }],
    },
  });

  // We throw on error cause we can't have two users in the same org with the same username
  if (isOrg && invitee) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Email ${usernameOrEmail} already exists, you can't invite existing users.`,
    });
  }

  return invitee;
}

function checkInputEmailIsValid(email: string) {
  if (!isEmail(email))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invite failed because ${email} is not a valid email address`,
    });
}

async function createNewUserConnectToOrgIfExists(
  usernameOrEmail: string,
  input: InviteMemberOptions["input"]
) {
  await prisma.user.create({
    data: {
      email: usernameOrEmail,
      invitedTo: input.teamId,
      ...(input.isOrg && { organizationId: input.teamId }),
      teams: {
        create: {
          teamId: input.teamId,
          role: input.role as MembershipRole,
        },
      },
    },
  });
}

async function createProvitionalMembership(
  input: InviteMemberOptions["input"],
  invitee: User,
  parentId?: number
) {
  try {
    await prisma.membership.create({
      data: {
        teamId: input.teamId,
        userId: invitee.id,
        role: input.role as MembershipRole,
      },
    });
    // Create the membership in the parent also if it exists
    if (parentId) {
      await prisma.membership.create({
        data: {
          teamId: parentId,
          userId: invitee.id,
          role: input.role as MembershipRole,
        },
      });
    }
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
}

async function sendVerificationEmail(
  usernameOrEmail: string,
  team: Awaited<ReturnType<typeof getTeamOrThrow>>,
  translation: TFunction,
  ctx: { user: NonNullable<TrpcSessionUser> },
  input: {
    teamId: number;
    role: "ADMIN" | "MEMBER" | "OWNER";
    usernameOrEmail: string | string[];
    language: string;
    sendEmailInvitation: boolean;
    isOrg: boolean;
  }
) {
  const token: string = randomBytes(32).toString("hex");

  await prisma.verificationToken.create({
    data: {
      identifier: usernameOrEmail,
      token,
      expires: new Date(new Date().setHours(168)), // +1 week
    },
  });
  if (team?.name) {
    await sendTeamInviteEmail({
      language: translation,
      from: ctx.user.name || `${team.name}'s admin`,
      to: usernameOrEmail,
      teamName: team.name,
      joinLink: `${WEBAPP_URL}/signup?token=${token}&callbackUrl=/getting-started`,
      isCalcomMember: false,
      isOrg: input.isOrg,
    });
  }
}

export const inviteMemberHandler = async ({ ctx, input }: InviteMemberOptions) => {
  await checkPermissions(ctx.user.id, input.teamId, input.isOrg);

  const translation = await getTranslation(input.language ?? "en", "common");

  const team = await getTeamOrThrow(input.teamId, input.isOrg);

  const emailsToInvite = await getEmailsToInvite(input.usernameOrEmail);

  emailsToInvite.forEach(async (usernameOrEmail) => {
    const invitee = await getUserToInviteOrThrowIfExists(usernameOrEmail, input.teamId, input.isOrg);

    if (!invitee) {
      checkInputEmailIsValid(usernameOrEmail);

      // valid email given, create User and add to team
      await createNewUserConnectToOrgIfExists(usernameOrEmail, input);

      await sendVerificationEmail(usernameOrEmail, team, translation, ctx, input);
    } else {
      // create provisional membership
      await createProvitionalMembership(input, invitee, parentId);

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
          isOrg: input.isOrg,
        });
      }
    }
  });
  if (IS_TEAM_BILLING_ENABLED) {
    if (team.parentId) {
      await updateQuantitySubscriptionFromStripe(input.teamId);
    } else {
      await updateQuantitySubscriptionFromStripe(input.teamId);
    }
  }
  return input;
};
