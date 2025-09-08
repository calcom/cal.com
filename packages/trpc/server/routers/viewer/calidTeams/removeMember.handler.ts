
import { CalIdMembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "../../../types";
import type { ZRemoveMemberInput } from "./removeMember.schema";
import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import type { CalIdMembership } from "@calcom/prisma/client";
import logger from "@calcom/lib/logger";

type RemoveMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZRemoveMemberInput;
};

export const removeMemberHandler = async ({ ctx, input }: RemoveMemberOptions) => {
  const { teamIds, memberIds } = input;
  const userId = ctx.user.id;

  // Check if user is admin or owner of all teams they are trying to remove members from
  const userMemberships: CalIdMembership[] = await prisma.calIdMembership.findMany({
    where: {
      userId: userId,
      calIdTeamId: { in: teamIds },
      role: { in: [CalIdMembershipRole.ADMIN, CalIdMembershipRole.OWNER] },
    },
  });

  if (userMemberships.length !== teamIds.length) {
    throw new TRPCError({ 
      code: "UNAUTHORIZED", 
      message: "unauthorized_to_remove_team_members" 
    });
  }

  // Check if any member being removed is a team owner and current user is not owner
  for (const teamId of teamIds) {
    const currentUserMembership = userMemberships.find((m) => m.calIdTeamId === teamId);
    const isCurrentUserOwner = currentUserMembership?.role === CalIdMembershipRole.OWNER;

    for (const memberId of memberIds) {
      const memberMembership = await prisma.calIdMembership.findFirst({
        where: {
          userId: memberId,
          calIdTeamId: teamId,
        },
      });

      if (memberMembership?.role === CalIdMembershipRole.OWNER && !isCurrentUserOwner) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Only team owner can remove team owner",
        });
      }

      // Prevent team owners from removing themselves
      if (memberId === userId && isCurrentUserOwner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot remove yourself from a team you own",
        });
      }
    }
  }

  await prisma.calIdMembership.deleteMany({
    where: {
      userId: { in: memberIds },
      calIdTeamId: { in: teamIds },
    },
  });
};
