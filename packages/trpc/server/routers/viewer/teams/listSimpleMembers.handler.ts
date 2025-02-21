import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TListSimpleMembersInputSchema } from "./listSimpleMembers.schema";

type ListSimpleMembersOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TListSimpleMembersInputSchema;
};

export const listSimpleMembers = async ({ ctx }: ListSimpleMembersOptions) => {
  const { prisma } = ctx;
  const { isOrgAdmin } = ctx.user.organization;
  const hasPermsToView = !ctx.user.organization.isPrivate || isOrgAdmin;

  if (!hasPermsToView) {
    return [];
  }

  // query all teams the user is a member of
  const teamsToQuery = (
    await prisma.membership.findMany({
      where: {
        userId: ctx.user.id,
        accepted: true,
      },
      select: { teamId: true },
    })
  ).map((membership) => membership.teamId);

  if (!teamsToQuery.length) {
    return [];
  }

  // Fetch unique users through memberships
  const members = (
    await prisma.membership.findMany({
      where: {
        accepted: true,
        teamId: { in: teamsToQuery },
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
      orderBy: [
        { userId: "asc" }, // First order by userId to ensure consistent ordering
        { id: "asc" }, // Then by id as secondary sort
      ],
    })
  ).map((membership) => membership.user);

  return members;
};

export default listSimpleMembers;
