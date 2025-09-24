import { randomBytes } from "crypto";

import { sendTeamInviteEmail } from "@calcom/emails";
import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import { CalIdMembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { ZInviteMemberInput } from "./inviteMember.schema";
import { createUserForInvitation } from "./utils";

type InviteMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZInviteMemberInput;
};

function buildInvitationsFromInput({
  usernameOrEmail,
  roleForAllInvitees,
}: {
  usernameOrEmail: ZInviteMemberInput["usernameOrEmail"];
  roleForAllInvitees: CalIdMembershipRole | undefined;
}) {
  if (!usernameOrEmail) return [];

  const usernameOrEmailList = typeof usernameOrEmail === "string" ? [usernameOrEmail] : usernameOrEmail;

  return usernameOrEmailList.map((usernameOrEmail) => {
    if (typeof usernameOrEmail === "string")
      return { usernameOrEmail: usernameOrEmail, role: roleForAllInvitees ?? CalIdMembershipRole.MEMBER };
    return {
      usernameOrEmail: usernameOrEmail.email,
      role: usernameOrEmail.role,
    };
  });
}

export const inviteMemberHandler = async ({ ctx, input }: InviteMemberOptions) => {
  const { teamId, token, usernameOrEmail, role } = input;
  const userId = ctx.user.id;

  const isTeamAdmin = await prisma.calIdMembership.findFirst({
    where: {
      userId,
      calIdTeamId: teamId,
      role: {
        in: [CalIdMembershipRole.ADMIN, CalIdMembershipRole.OWNER],
      },
    },
  });

  if (!isTeamAdmin)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You are not authorized to invite team member" });

  if (token) {
    const existingToken = await prisma.verificationToken.findFirst({
      where: { token, calIdTeamId: teamId },
    });
    if (!existingToken) throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
    return {
      token: existingToken.token,
    };
  }

  if (usernameOrEmail) {
    const invitations = buildInvitationsFromInput({
      usernameOrEmail,
      roleForAllInvitees: role,
    });

    const team = await prisma.calIdTeam.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
    }

    // Separate existing users from new users
    const existingUsers = [];
    const newUsers = [];

    for (const invitation of invitations) {
      const { usernameOrEmail: email, role: inviteRole } = invitation;
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        const existingMembership = await prisma.calIdMembership.findFirst({
          where: {
            userId: existingUser.id,
            calIdTeamId: teamId,
          },
        });

        if (existingMembership) {
          continue; // Skip already members
        }

        existingUsers.push({ user: existingUser, role: inviteRole, email });
      } else {
        newUsers.push({ email, role: inviteRole });
      }
    }

    const results = [];

    // Handle existing users
    for (const { user, role: inviteRole, email } of existingUsers) {
      try {
        // Create membership for existing user
        await prisma.calIdMembership.create({
          data: {
            userId: user.id,
            calIdTeamId: teamId,
            role: inviteRole,
            acceptedInvitation: false,
          },
        });

        // Send invitation email to existing user
        await sendTeamInviteEmail({
          to: email,
          from: ctx.user.name || "A team admin",
          language: await getTranslation(input.language, "common"),
          teamName: team.name,
          joinLink: `${WEBAPP_URL}/auth/login?callbackUrl=/settings/teams`,
          isCalcomMember: true,
          isAutoJoin: false,
          isOrg: false,
          parentTeamName: undefined,
          isExistingUserMovedToOrg: false,
          prevLink: null,
          newLink: null,
        });

        results.push({
          email,
          status: "invited",
          message: "Invitation sent to existing user",
        });
      } catch (error) {
        logger.error("Failed to invite existing user:", error);
        results.push({
          email,
          status: "error",
          message: "Failed to invite existing user",
        });
      }
    }

    // Handle new users
    for (const { email, role: inviteRole } of newUsers) {
      try {
        // Create user and membership
        await createUserForInvitation(email, teamId, inviteRole);
        // Create verification token
        const inviteToken = randomBytes(32).toString("hex");
        await prisma.verificationToken.create({
          data: {
            token: inviteToken,
            calIdTeamId: teamId,
            identifier: `invite-for-calid-team-${teamId}-${email}`,
            expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
            expiresInDays: 7,
          },
        });

        // Send invitation email to new user
        await sendTeamInviteEmail({
          to: email,
          from: ctx.user.name || "A team admin",
          language: await getTranslation(input.language, "common"),
          teamName: team.name,
          joinLink: `${WEBAPP_URL}/signup?token=${inviteToken}&callbackUrl=/teams/${teamId}`,
          isCalcomMember: false,
          isAutoJoin: false,
          isOrg: false,
          parentTeamName: undefined,
          isExistingUserMovedToOrg: false,
          prevLink: null,
          newLink: null,
        });

        results.push({
          email,
          status: "invited",
          message: "Invitation sent to new user",
          token: inviteToken,
        });
      } catch (error) {
        logger.error("Failed to invite new user:", error);
        results.push({
          email,
          status: "error",
          message: "Failed to invite new user",
        });
      }
    }

    return {
      results,
      teamName: team.name,
    };
  }

  const newToken = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: {
      token: newToken,
      calIdTeamId: teamId,
      identifier: `invite-for-calid-team-${teamId}`,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      expiresInDays: 7,
    },
  });

  return {
    token: newToken,
  };
};
