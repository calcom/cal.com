import { checkIfMemberAdminorOwner } from "@calid/features/modules/teams/lib/checkIfMemberAdminorOwner";
import type { Prisma } from "@prisma/client";

import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { ZListMembersInput } from "./listMembers.schema";

type ListMembersOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZListMembersInput;
};

export const listMembersHandler = async ({ ctx, input }: ListMembersOptions) => {
  const { teamId, searchQuery, limit, paging } = input;
  const { user } = ctx;

  const calIdTeam = await prisma.calIdTeam.findUnique({
    where: {
      id: teamId,
    },
  });

  if (!calIdTeam) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team not found",
    });
  }

  const calIdMembership = await prisma.calIdMembership.findFirst({
    where: {
      userId: user.id,
      calIdTeamId: teamId,
    },
  });

  if (!calIdMembership) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not authorized to see members of this team",
    });
  }

  if (calIdTeam.isTeamPrivate) {
    const isMemberAdminOrOwner = checkIfMemberAdminorOwner(calIdMembership?.role);
    if (!isMemberAdminOrOwner) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You are not authorized to see members of this team",
      });
    }
  }

  const whereCondition: Prisma.CalIdMembershipWhereInput = {
    calIdTeamId: teamId,
  };

  if (searchQuery) {
    whereCondition.user = {
      OR: [
        { email: { contains: searchQuery, mode: "insensitive" } },
        { username: { contains: searchQuery, mode: "insensitive" } },
        { name: { contains: searchQuery, mode: "insensitive" } },
      ],
    };
  }

  const teamMembers = await prisma.calIdMembership.findMany({
    where: whereCondition,
    skip: paging ? paging * limit : 0,
    take: limit + 1,
    select: {
      id: true,
      role: true,
      calIdTeamId: true,
      acceptedInvitation: true,
      user: {
        select: {
          email: true,
          username: true,
          name: true,
          avatarUrl: true,
          id: true,
          bio: true,
          disableImpersonation: true,
          lastActiveAt: true,
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });

  const hasMore = teamMembers.length > limit;
  const members = hasMore ? teamMembers.slice(0, limit) : teamMembers;
  const nextPaging = hasMore ? (paging || 0) + 1 : null;

  return {
    members,
    nextPaging,
  };
};
