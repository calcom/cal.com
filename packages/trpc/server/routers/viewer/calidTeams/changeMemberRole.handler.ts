import { prisma } from "@calcom/prisma";
import { CalIdMembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { ZChangeCalidMemberRoleInput } from "./changeMemberRole.schema";

type ChangeCalidMemberRoleOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZChangeCalidMemberRoleInput;
};

export const changeCalidMemberRoleHandler = async ({ ctx, input }: ChangeCalidMemberRoleOptions) => {
  const { teamId, memberId, role } = input;
  const userId = ctx.user.id;

  // Check if the current user is admin or owner of the team
  const currentUserMembership = await prisma.calIdMembership.findFirst({
    where: {
      userId: userId,
      calIdTeamId: teamId,
      role: {
        in: [CalIdMembershipRole.ADMIN, CalIdMembershipRole.OWNER],
      },
    },
  });

  if (!currentUserMembership) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not authorized to change member roles in this team",
    });
  }

  // Get the target member's current membership
  const targetMembership = await prisma.calIdMembership.findFirst({
    where: {
      userId: memberId,
      calIdTeamId: teamId,
    },
  });

  if (!targetMembership) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Member not found in this team",
    });
  }

  // Check if current user is trying to change their own role
  if (memberId === userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You cannot change your own role",
    });
  }

  // Only owners can assign owner or admin roles
  if (role === CalIdMembershipRole.OWNER || role === CalIdMembershipRole.ADMIN) {
    if (currentUserMembership.role !== CalIdMembershipRole.OWNER) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only team owners can assign owner or admin roles",
      });
    }
  }

  // Prevent admins from changing owner roles
  if (
    currentUserMembership.role === CalIdMembershipRole.ADMIN &&
    targetMembership.role === CalIdMembershipRole.OWNER
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admins cannot change the role of team owners",
    });
  }

  // Check if there's only one owner and prevent changing their role
  if (targetMembership.role === CalIdMembershipRole.OWNER) {
    const ownerCount = await prisma.calIdMembership.count({
      where: {
        calIdTeamId: teamId,
        role: CalIdMembershipRole.OWNER,
      },
    });

    if (ownerCount === 1) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot change the role of the only team owner",
      });
    }
  }

  // Update the member's role
  const updatedMembership = await prisma.calIdMembership.update({
    where: {
      userId_calIdTeamId: {
        userId: memberId,
        calIdTeamId: teamId,
      },
    },
    data: {
      role: role,
    },
    include: {
      user: true,
    },
  });

  return updatedMembership;
};
