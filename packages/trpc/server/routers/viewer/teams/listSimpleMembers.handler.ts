/**
 * Simplified version of legacyListMembers.handler.ts that returns basic member info.
 * Used for filtering people on /bookings.
 */
import type { PrismaClient } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type ListSimpleMembersOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
};

export const listSimpleMembers = async ({ ctx }: ListSimpleMembersOptions) => {
  const { prisma } = ctx;
  const { isOrgAdmin } = ctx.user.organization;
  const hasPermsToView = !ctx.user.organization.isPrivate || isOrgAdmin;

  if (!hasPermsToView) {
    return [];
  }

  // query all teams the user is a member of and the team is not private
  const teamsToQuery = (
    await prisma.membership.findMany({
      where: {
        userId: ctx.user.id,
        accepted: true,
        NOT: [
          {
            role: MembershipRole.MEMBER,
            team: {
              isPrivate: true,
            },
          },
        ],
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
