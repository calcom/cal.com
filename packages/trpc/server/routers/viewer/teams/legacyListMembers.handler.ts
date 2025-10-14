import { Resource, CustomAction } from "@calcom/features/pbac/domain/types/permission-registry";
import { getSpecificPermissions } from "@calcom/features/pbac/lib/resource-permissions";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
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
  const orgId = ctx.user.organizationId;

  // Check PBAC permissions for the organization if it's private
  if (orgId) {
    const hasPermsToView = await checkCanAccessOrgMembers(ctx, orgId);

    if (!hasPermsToView) {
      return {
        members: [],
        nextCursor: undefined,
      };
    }
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

const checkCanAccessOrgMembers = async (ctx: ListMembersOptions["ctx"], orgId: number): Promise<boolean> => {
  const { prisma } = ctx;

  // Get organization info to verify it's private
  const org = await prisma.team.findUnique({
    where: { id: orgId },
    select: { isPrivate: true },
  });

  if (!org) return false;

  // Check PBAC permissions for listing members
  const permissionCheckService = new PermissionCheckService();

  const hasPermission = await permissionCheckService.checkPermission({
    userId: ctx.user.id,
    teamId: orgId,
    permission: org.isPrivate ? "organization.listMembersPrivate" : "organization.listMembers",
    fallbackRoles: org.isPrivate
      ? [MembershipRole.ADMIN, MembershipRole.OWNER]
      : [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER],
  });

  return hasPermission;
};

export default legacyListMembers;
