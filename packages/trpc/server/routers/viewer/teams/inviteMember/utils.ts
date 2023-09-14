import { randomBytes } from "crypto";
import type { TFunction } from "next-i18next";

import { sendTeamInviteEmail, sendOrganizationAutoJoinEmail } from "@calcom/emails";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { isTeamAdmin } from "@calcom/lib/server/queries";
import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import slugify from "@calcom/lib/slugify";
import { prisma } from "@calcom/prisma";
import type { Team } from "@calcom/prisma/client";
import { Prisma, type User } from "@calcom/prisma/client";
import type { MembershipRole } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../trpc";
import { isEmail } from "../util";
import type { InviteMemberOptions, TeamWithParent } from "./types";

export async function checkPermissions({
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

export async function getTeamOrThrow(teamId: number, isOrg?: boolean) {
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

export async function getEmailsToInvite(usernameOrEmail: string | string[]) {
  const emailsToInvite = Array.isArray(usernameOrEmail) ? usernameOrEmail : [usernameOrEmail];

  if (emailsToInvite.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You must provide at least one email address to invite.",
    });
  }

  return emailsToInvite;
}

export async function getUserToInviteOrThrowIfExists({
  usernameOrEmail,
  teamId,
  isOrg,
}: {
  usernameOrEmail: string;
  teamId: number;
  isOrg?: boolean;
}) {
  // Check if user exists in ORG or exists all together

  const orgWhere = isOrg && {
    organizationId: teamId,
  };
  const invitee = await prisma.user.findFirst({
    where: {
      OR: [{ username: usernameOrEmail, ...orgWhere }, { email: usernameOrEmail }],
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

export function checkInputEmailIsValid(email: string) {
  if (!isEmail(email))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invite failed because ${email} is not a valid email address`,
    });
}

export function getOrgConnectionInfo({
  orgAutoAcceptDomain,
  orgVerified,
  isOrg,
  usersEmail,
  team,
}: {
  orgAutoAcceptDomain?: string | null;
  orgVerified?: boolean | null;
  usersEmail: string;
  team: TeamWithParent;
  isOrg: boolean;
}) {
  let orgId: number | undefined = undefined;
  let autoAccept = false;

  if (team.parentId || isOrg) {
    orgId = team.parentId || team.id;
    if (usersEmail.split("@")[1] == orgAutoAcceptDomain) {
      autoAccept = orgVerified ?? true;
    } else {
      orgId = undefined;
      autoAccept = false;
    }
  }

  return { orgId, autoAccept };
}

export async function createNewUserConnectToOrgIfExists({
  usernameOrEmail,
  input,
  parentId,
  autoAcceptEmailDomain,
  connectionInfo,
}: {
  usernameOrEmail: string;
  input: InviteMemberOptions["input"];
  parentId?: number | null;
  autoAcceptEmailDomain?: string;
  connectionInfo: ReturnType<typeof getOrgConnectionInfo>;
}) {
  const { orgId, autoAccept } = connectionInfo;

  const [emailUser, emailDomain] = usernameOrEmail.split("@");
  const username =
    emailDomain === autoAcceptEmailDomain
      ? slugify(emailUser)
      : slugify(`${emailUser}-${emailDomain.split(".")[0]}`);

  const createdUser = await prisma.user.create({
    data: {
      username,
      email: usernameOrEmail,
      verified: true,
      invitedTo: input.teamId,
      organizationId: orgId || null, // If the user is invited to a child team, they are automatically added to the parent org
      teams: {
        create: {
          teamId: input.teamId,
          role: input.role as MembershipRole,
          accepted: autoAccept, // If the user is invited to a child team, they are automatically accepted
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
        accepted: autoAccept,
      },
    });
  }
}

export async function createProvisionalMembership({
  input,
  invitee,
  parentId,
}: {
  input: InviteMemberOptions["input"];
  invitee: User;
  parentId?: number;
}) {
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

export async function sendVerificationEmail({
  usernameOrEmail,
  team,
  translation,
  ctx,
  input,
  connectionInfo,
}: {
  usernameOrEmail: string;
  team: Awaited<ReturnType<typeof getTeamOrThrow>>;
  translation: TFunction;
  ctx: { user: NonNullable<TrpcSessionUser> };
  input: {
    teamId: number;
    role: "ADMIN" | "MEMBER" | "OWNER";
    usernameOrEmail: string | string[];
    language: string;
    sendEmailInvitation: boolean;
    isOrg: boolean;
  };
  connectionInfo: ReturnType<typeof getOrgConnectionInfo>;
}) {
  const token: string = randomBytes(32).toString("hex");

  await prisma.verificationToken.create({
    data: {
      identifier: usernameOrEmail,
      token,
      expires: new Date(new Date().setHours(168)), // +1 week
      team: {
        connect: {
          id: connectionInfo.orgId || input.teamId,
        },
      },
    },
  });
  if (!connectionInfo.autoAccept) {
    await sendTeamInviteEmail({
      language: translation,
      from: ctx.user.name || `${team.name}'s admin`,
      to: usernameOrEmail,
      teamName: team?.parent?.name || team.name,
      joinLink: `${WEBAPP_URL}/signup?token=${token}&callbackUrl=/getting-started`,
      isCalcomMember: false,
      isOrg: input.isOrg,
    });
  } else {
    await sendOrganizationAutoJoinEmail({
      language: translation,
      from: ctx.user.name || `${team.name}'s admin`,
      to: usernameOrEmail,
      orgName: team?.parent?.name || team.name,
      joinLink: `${WEBAPP_URL}/signup?token=${token}&callbackUrl=/getting-started`,
    });
  }
}

export function throwIfInviteIsToOrgAndUserExists(invitee: User, team: TeamWithParent, isOrg: boolean) {
  if (invitee.organizationId && invitee.organizationId === team.parentId) {
    return;
  }

  if (invitee.organizationId && invitee.organizationId !== team.parentId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `User ${invitee.username} is already a member of another organization.`,
    });
  }

  if ((invitee && isOrg) || (team.parentId && invitee)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You cannot add a user that already exists in Cal.com to an organization. If they wish to join via this email address, they must update their email address in their profile to that of your organization.`,
    });
  }
}

export function getIsOrgVerified(
  isOrg: boolean,
  team: Team & {
    parent: Team | null;
  }
) {
  const teamMetadata = teamMetadataSchema.parse(team.metadata);
  const orgMetadataSafeParse = teamMetadataSchema.safeParse(team.parent?.metadata);
  const orgMetadataIfExists = orgMetadataSafeParse.success ? orgMetadataSafeParse.data : null;

  if (isOrg && teamMetadata?.orgAutoAcceptEmail) {
    return {
      isInOrgScope: true,
      orgVerified: teamMetadata.isOrganizationVerified,
      autoAcceptEmailDomain: teamMetadata.orgAutoAcceptEmail,
    };
  } else if (orgMetadataIfExists?.orgAutoAcceptEmail) {
    return {
      isInOrgScope: true,
      orgVerified: orgMetadataIfExists.isOrganizationVerified,
      autoAcceptEmailDomain: orgMetadataIfExists.orgAutoAcceptEmail,
    };
  }

  return {
    isInOrgScope: false,
  } as { isInOrgScope: false; orgVerified: never; autoAcceptEmailDomain: never };
}

export async function createAndAutoJoinIfInOrg({
  team,
  role,
  invitee,
}: {
  team: TeamWithParent;
  invitee: User;
  role: MembershipRole;
}) {
  if (invitee.organizationId && invitee.organizationId !== team.parentId) {
    return {
      autoJoined: false,
    };
  }

  if (!team.parentId) {
    return {
      autoJoined: false,
    };
  }

  const orgMembership = await prisma.membership.findFirst({
    where: {
      userId: invitee.id,
      teamId: team.parentId,
    },
  });

  if (!orgMembership?.accepted) {
    return {
      autoJoined: false,
    };
  }

  // Since we early return if the user is not a member of the org. Or the team they are being invited to is an org (not having a parentID)
  // We create the membership in the child team
  await prisma.membership.create({
    data: {
      userId: invitee.id,
      teamId: team.id,
      accepted: true,
      role: role,
    },
  });

  return {
    autoJoined: true,
  };
}
