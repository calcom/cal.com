import { randomBytes } from "crypto";

import prisma from "@calcom/prisma";
import { CalIdMembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { ZInviteMemberInput } from "./inviteMember.schema";

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

    const results = [];
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
          results.push({
            email,
            status: "already_member",
            message: "User is already a member of this team",
          });
          continue;
        }

        await prisma.calIdMembership.create({
          data: {
            userId: existingUser.id,
            calIdTeamId: teamId,
            role: inviteRole,
            acceptedInvitation: false,
          },
        });

        results.push({
          email,
          status: "invited",
          message: "Invitation sent to existing user",
        });
      } else {
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

        results.push({
          email,
          status: "invited",
          message: "Invitation sent to new user",
          token: inviteToken,
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
