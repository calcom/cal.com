import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import type { TFunction } from "next-i18next";

import { sendTeamInviteEmail } from "@calcom/emails";
import { updateQuantitySubscriptionFromStripe } from "@calcom/features/ee/teams/lib/payments";
import { IS_TEAM_BILLING_ENABLED, WEBAPP_URL } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/lib/server/i18n";
import { isTeamAdmin } from "@calcom/lib/server/queries";
import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { prisma } from "@calcom/prisma";
import type { Team, User } from "@calcom/prisma/client";
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

async function checkPermissions({
  userId,
  teamId,
  isOrg,
}: {
  userId: number;
  teamId: number;
  isOrg?: boolean;
}) {
  // Checks if the team they are inviteing to IS the org. Not a child team
  if (isOrg) {
    if (!(await isOrganisationAdmin(userId, teamId))) throw new TRPCError({ code: "UNAUTHORIZED" });
  } else {
    // TODO: do some logic here to check if the user is inviting a NEW user to a team that ISNT in the same org
    if (!(await isTeamAdmin(userId, teamId))) throw new TRPCError({ code: "UNAUTHORIZED" });
  }
}

async function getTeamOrThrow(teamId: number, isOrg?: boolean) {
  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
    },
    include: {
      parent: true,
    },
  });

  if (!team)
    throw new TRPCError({ code: "NOT_FOUND", message: `${isOrg ? "Organization" : "Team"} not found` });
  return team;
}

async function getEmailsToInvite(usernameOrEmail: string | string[]) {
  const emailsToInvite = Array.isArray(usernameOrEmail) ? usernameOrEmail : [usernameOrEmail];

  if (emailsToInvite.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You must provide at least one email address to invite.",
    });
  }
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
  input: InviteMemberOptions["input"],
  parentId?: number | null
) {
  const createdUser = await prisma.user.create({
    data: {
      email: usernameOrEmail,
      invitedTo: input.teamId,
      ...((parentId || input.isOrg) && { organizationId: parentId || input.teamId }), // If the user is invited to a child team, they are automatically added to the parent org
      teams: {
        create: {
          teamId: input.teamId,
          role: input.role as MembershipRole,
          ...(parentId && { accepted: true }), // If the user is invited to a child team, they are automatically accepted
        },
      },
    },
  });

  // We also need to create the membership in the parent org if it exists
  if (parentId) {
    await prisma.membership.create({
      data: {
        teamId: parentId,
        userId: createdUser.id,
        role: input.role as MembershipRole,
        accepted: true,
      },
    });
  }
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
      teamName: team?.parent?.name || team.name,
      joinLink: `${WEBAPP_URL}/signup?token=${token}&callbackUrl=/getting-started`,
      isCalcomMember: false,
      isOrg: input.isOrg,
    });
  }
}

function checkIfUserIsInDifOrg(
  invitee: User,
  team: Team & {
    parent: Team | null;
  }
) {
  if (invitee.organizationId !== team.parentId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `User ${invitee.username} is already a member of another organization.`,
    });
  }
}

export const inviteMemberHandler = async ({ ctx, input }: InviteMemberOptions) => {
  const team = await getTeamOrThrow(input.teamId, input.isOrg);

  await checkPermissions({ userId: ctx.user.id, teamId: input.teamId, isOrg: input.isOrg });

  const translation = await getTranslation(input.language ?? "en", "common");

  const emailsToInvite = await getEmailsToInvite(input.usernameOrEmail);

  for (const usernameOrEmail of emailsToInvite) {
    const invitee = await getUserToInviteOrThrowIfExists(usernameOrEmail, input.teamId, input.isOrg);

    if (!invitee) {
      checkInputEmailIsValid(usernameOrEmail);

      // valid email given, create User and add to team
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
          joinLink: `${WEBAPP_URL}/signup?token=${token}&callbackUrl=/getting-started`, // we know that the user has not completed onboarding yet, so we can redirect them to the onboarding flow
          isCalcomMember: false,
          isOrg: input.isOrg,
        });
      }
    } else {
      checkIfUserIsInDifOrg(invitee, team);

      // create provisional membership
      await createProvitionalMembership(input, invitee, team.id);

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
  }

  if (IS_TEAM_BILLING_ENABLED) {
    if (team.parentId) {
      await updateQuantitySubscriptionFromStripe(team.parentId);
    } else {
      await updateQuantitySubscriptionFromStripe(input.teamId);
    }
  }
  return input;
};
