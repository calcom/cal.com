import { checkIfMemberAdminorOwner } from "@calid/features/modules/teams/lib/checkIfMemberAdminorOwner";
import type { Prisma } from "@prisma/client";

import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { ZAllTeamsListMembersInput } from "./allTeamsListMembers.schema";

type ListMembersOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZAllTeamsListMembersInput;
};

export const listMembersHandler = async ({ ctx, input }: ListMembersOptions) => {
  const { teamId, searchQuery, limit, paging } = input;
  const { user } = ctx;

  const memberships = await prisma.calIdMembership.findMany({
    where: {
      userId: ctx.user.id,
      acceptedInvitation: true,
      ...(input.adminOrOwnedTeamsOnly ? { role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER] } } : {}),
    },
    select: { calIdTeamId: true },
  });
  const teamsToQuery = memberships.map((m) => m.calIdTeamId);

  const whereCondition: Prisma.CalIdMembershipWhereInput = {
    // calIdTeamId: teamId,
    calIdTeamId: { in: teamsToQuery },
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
