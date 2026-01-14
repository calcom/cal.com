import { randomBytes } from "crypto";
import { z } from "zod";

import { sendTeamInviteEmail } from "@calcom/emails";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { checkIfUserNameTaken, usernameSlugRandom } from "@calcom/lib/getName";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";
import { CalIdMembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

interface CalIdTeamMember {
  email: string;
  role: CalIdMembershipRole;
}

interface CalIdTeamInfo {
  id: number;
  name: string;
  slug: string | null;
}

// Input validation schemas
export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(CalIdMembershipRole),
});

export const teamInviteSchema = z.array(inviteMemberSchema);

// Core utility functions
export async function validateCalIdTeamAccess(userId: number, calIdTeamId: number) {
  const membership = await prisma.calIdMembership.findFirst({
    where: {
      userId,
      calIdTeamId,
      acceptedInvitation: true,
      role: {
        in: [CalIdMembershipRole.ADMIN, CalIdMembershipRole.OWNER],
      },
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You don't have admin access to this team",
    });
  }

  return membership;
}

export async function getCalIdTeam(calIdTeamId: number): Promise<CalIdTeamInfo> {
  const team = await prisma.calIdTeam.findUnique({
    where: { id: calIdTeamId },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!team) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team not found",
    });
  }

  return team;
}

export async function processCalIdTeamInvites(
  invites: z.infer<typeof teamInviteSchema>,
  calIdTeamId: number,
  inviterName: string,
  language: string
) {
  const uniqueInvites = removeDuplicateInvites(invites);
  const team = await getCalIdTeam(calIdTeamId);

  const inviteResults = await Promise.all(
    uniqueInvites.map((invite) => processInvite(invite, team, inviterName, language))
  );

  return {
    successful: inviteResults.filter((r) => r.success),
    failed: inviteResults.filter((r) => !r.success),
  };
}

async function processInvite(
  invite: CalIdTeamMember,
  team: CalIdTeamInfo,
  inviterName: string,
  language: string
): Promise<{ success: boolean; email: string; error?: string }> {
  try {
    const existingUser = await prisma.user.findFirst({
      where: { email: invite.email },
      include: {
        calIdTeams: {
          where: { calIdTeamId: team.id },
        },
      },
    });

    if (existingUser?.calIdTeams.length) {
      return {
        success: false,
        email: invite.email,
        error: "User is already a member of this team",
      };
    }

    let token: string | undefined;
    if (existingUser) {
      await createCalIdMembershipForExistingUser(existingUser.id, team.id, invite.role);
    } else {
      await createUserForInvitation(invite.email, team.id, invite.role);
      token = await createNewTokenForNewUser(invite.email, team, inviterName);
    }

    await sendInviteEmail(invite.email, team, inviterName, !!existingUser, language, token);

    return { success: true, email: invite.email };
  } catch (error) {
    return {
      success: false,
      email: invite.email,
      error: "Failed to process invite",
    };
  }
}

async function createCalIdMembershipForExistingUser(
  userId: number,
  calIdTeamId: number,
  role: CalIdMembershipRole
) {
  await prisma.calIdMembership.create({
    data: {
      userId,
      calIdTeamId,
      role,
      acceptedInvitation: false,
    },
  });
}

export async function createUserForInvitation(email: string, calIdTeamId: number, role: CalIdMembershipRole) {
  // Create a new user for the invitation

  const prefixUsername = email.split("@")[0];

  const { existingUserWithUsername, username: _username } = await checkIfUserNameTaken({
    username: prefixUsername,
  });

  const username = existingUserWithUsername ? usernameSlugRandom(prefixUsername) : prefixUsername;

  const newUser = await prisma.user.create({
    data: {
      email,
      username: username, // Use email prefix as username
      verified: false, // User needs to verify their email
      invitedTo: calIdTeamId,
    },
  });

  // Create the membership for the new user
  const membership = await prisma.calIdMembership.create({
    data: {
      userId: newUser.id,
      calIdTeamId,
      role,
      acceptedInvitation: false,
    },
  });

  return newUser;
}

async function createNewTokenForNewUser(email: string, team: CalIdTeamInfo, _inviterName: string) {
  const token = randomBytes(32).toString("hex");

  const verificationToken = await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      calIdTeamId: team.id,
    },
  });

  return token;
}

async function sendInviteEmail(
  email: string,
  team: CalIdTeamInfo,
  inviterName: string,
  existingUser: boolean,
  language: string,
  token?: string
) {
  const translation = await getTranslation(language, "common");

  let joinLink = null;
  if (existingUser) {
    joinLink = `${WEBAPP_URL}/auth/login?token=${token}&callbackUrl=/settings/teams`;
  } else {
    joinLink = `${WEBAPP_URL}/signup?token=${token}&callbackUrl=/teams`;
  }

  try {
    await sendTeamInviteEmail({
      to: email,
      from: inviterName,
      language: translation,
      teamName: team.name,
      joinLink: joinLink,
      isCalcomMember: false,
      isAutoJoin: false,
      isOrg: false,
      parentTeamName: undefined,
      isExistingUserMovedToOrg: false,
      prevLink: null,
      newLink: null,
    });
  } catch (error) {
    throw error;
  }
}

function removeDuplicateInvites(invites: CalIdTeamMember[]): CalIdTeamMember[] {
  const uniqueEmails = new Set<string>();
  return invites.filter((invite) => {
    if (uniqueEmails.has(invite.email)) return false;
    uniqueEmails.add(invite.email);
    return true;
  });
}

export function validateCalIdInvites(invites: unknown) {
  const result = teamInviteSchema.safeParse(invites);
  if (!result.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid invite data",
    });
  }
  return result.data;
}
