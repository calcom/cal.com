import { TeamRepository } from "@calcom/lib/server/repository/team";
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
    const memberships = await TeamRepository.listAllMemberships({
      userId: ctx.user.id,
      where: {
        accepted: true,
        ...(input.adminOrOwnedTeamsOnly
          ? { role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER] } }
          : {}),
      },
      select: { teamId: true },
    });
    teamsToQuery = memberships.map((m: { teamId: number }) => m.teamId);
  } else {
    const memberships = await TeamRepository.listAllMemberships({
      userId: ctx.user.id,
      where: {
        teamId: { in: input.teamIds },
        accepted: true,
        ...(input.adminOrOwnedTeamsOnly
          ? { role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER] } }
          : {}),
      },
    });
    teamsToQuery = memberships.map((m: { teamId: number }) => m.teamId);
  }

  if (!teamsToQuery.length) {
    return {
      members: [],
      nextCursor: undefined,
    };
  }

  const { members: memberships, meta } = await TeamRepository.listMembersWithSearch({
    teamIds: teamsToQuery || [],
    searchText: input.searchText,
    cursor: cursor ? String(cursor) : undefined,
    limit: limit + 1,
  });

  const enrichedMembers = await Promise.all(
    memberships.map(async (membership) =>
      UserRepository.enrichUserWithItsProfile({
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
