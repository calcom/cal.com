import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";

import type { TrpcSessionUser } from "../../../types";
import type { TListMembersMinimalInput } from "./listMembersMinimal.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListMembersMinimalInput;
};

// Get all members from non-private teams the user belongs to. Excluding organizations.
export const listMembersMinimalHandler = async ({ ctx, input }: GetOptions) => {
  const userId = ctx.user.id;
  const membershipRepository = new MembershipRepository();

  const teamIds = await membershipRepository.findAcceptedNonPrivateTeamIdsByUserId({ userId });

  // Return empty if user has no non-private teams
  if (teamIds.length === 0) {
    return {
      items: [],
      nextCursor: null,
    };
  }

  const { limit, cursor, searchTerm } = input;

  // Fetch members with distinct users (to avoid duplicates across teams)
  const members = await membershipRepository.findDistinctMembersFromTeams({
    teamIds,
    cursor,
    searchTerm,
    limit: limit + 1,
  });

  const items = members
    .filter((m): m is typeof m & { user: { username: string } } => m.user.username !== null)
    .map((m) => ({
      id: m.user.id,
      name: m.user.name ?? m.user.username,
      username: m.user.username,
    }));

  let nextCursor: number | null = null;
  if (items.length > limit) {
    const nextItem = items.pop();
    nextCursor = nextItem?.id ?? null;
  }

  return {
    items,
    nextCursor,
  };
};

export default listMembersMinimalHandler;
