import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TChangeMemberRoleInputSchema } from "./changeMemberRole.schema";

type ChangeMemberRoleOptions = {
  ctx: {
    user: TrpcSessionUser;
  };
  input: TChangeMemberRoleInputSchema;
};

export const changeMemberRoleHandler = async ({ ctx, input }: ChangeMemberRoleOptions) => {
  const { membershipId, role } = input;

  // Find the membership
  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      team: {
        select: {
          id: true,
          name: true,
          isOrganization: true,
        },
      },
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Membership not found",
    });
  }

  // Update the membership role
  const updatedMembership = await prisma.membership.update({
    where: { id: membershipId },
    data: { role },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          avatarUrl: true,
          locked: true,
          role: true,
        },
      },
      team: {
        select: {
          id: true,
          name: true,
          isOrganization: true,
        },
      },
    },
  });

  return {
    id: updatedMembership.id,
    userId: updatedMembership.user.id,
    teamId: updatedMembership.teamId,
    role: updatedMembership.role,
    accepted: updatedMembership.accepted,
    disableImpersonation: updatedMembership.disableImpersonation,
    createdAt: updatedMembership.createdAt,
    user: {
      id: updatedMembership.user.id,
      name: updatedMembership.user.name,
      email: updatedMembership.user.email,
      username: updatedMembership.user.username,
      avatarUrl: updatedMembership.user.avatarUrl,
      locked: updatedMembership.user.locked,
      role: updatedMembership.user.role,
    },
    team: updatedMembership.team,
  };
};

export default changeMemberRoleHandler;
