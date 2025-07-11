import type { Prisma } from "@prisma/client";

import { UserRepository } from "@calcom/lib/server/repository/user";
import type { PrismaClient } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TLegacyListMembersInputSchema } from "./legacyListMembers.schema";

type ListMembersOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TLegacyListMembersInputSchema;
};

export const legacyListMembers = async ({ ctx, input }: ListMembersOptions) => {
  const { prisma } = ctx;
  const { isOrgAdmin } = ctx.user.organization;
  const hasPermsToView = !ctx.user.organization.isPrivate || isOrgAdmin;

  if (!hasPermsToView) {
    return {
      members: [],
      nextCursor: undefined,
    };
  }

  const limit = input.limit ?? 10;
  const cursor = input.cursor ?? 0;

  let teamsToQuery = input.teamIds;

  // If no teamIds are provided, we query all teams the user is a member of
  if (!input?.teamIds?.length) {
    const memberships = await prisma.membership.findMany({
      where: {
        userId: ctx.user.id,
        accepted: true,
        ...(input.adminOrOwnedTeamsOnly
          ? { role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER] } }
          : {}),
      },
      select: { teamId: true },
    });
    teamsToQuery = memberships.map((m) => m.teamId);
  } else {
    const memberships = await prisma.membership.findMany({
      where: {
        teamId: { in: input.teamIds },
        userId: ctx.user.id,
        accepted: true,
        ...(input.adminOrOwnedTeamsOnly
          ? { role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER] } }
          : {}),
      },
    });
    teamsToQuery = memberships.map((m) => m.teamId);
  }

  if (!teamsToQuery.length) {
    return {
      members: [],
      nextCursor: undefined,
    };
  }

  const searchTextClauses: Prisma.UserWhereInput[] = [
    { name: { contains: input.searchText, mode: "insensitive" } },
    { username: { contains: input.searchText, mode: "insensitive" } },
  ];

  // Fetch unique users through memberships
  const memberships = await prisma.membership.findMany({
    where: {
      accepted: true,
      teamId: { in: teamsToQuery },
      user: input.searchText?.trim()?.length
        ? {
            OR: searchTextClauses,
          }
        : undefined,
    },
    select: {
      id: true,
      accepted: true,
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
          email: true,
        },
      },
    },
    distinct: ["userId"],
    cursor: cursor ? { id: cursor } : undefined,
    take: limit + 1,
    orderBy: [
      { userId: "asc" }, // First order by userId to ensure consistent ordering
      { id: "asc" }, // Then by id as secondary sort
    ],
  });

  const enrichedMembers = await Promise.all(
    memberships.map(async (membership) =>
      new UserRepository(prisma).enrichUserWithItsProfile({
        user: {
          ...membership.user,
          accepted: membership.accepted,
          membershipId: membership.id,
        },
      })
    )
  );

  const usersFetched = enrichedMembers.length;

  let nextCursor: typeof cursor | undefined = undefined;
  if (usersFetched > limit) {
    const nextItem = enrichedMembers.pop();
    nextCursor = nextItem?.membershipId;
  }

  return {
    members: enrichedMembers,
    nextCursor,
  };
};

export default legacyListMembers;
