import { getMembershipRepository } from "@calcom/features/di/containers/MembershipRepository";

import type { TrpcSessionUser } from "../../../types";
import type { TListMembersForDynamicLinkInput } from "./listMembersForDynamicLink.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListMembersForDynamicLinkInput;
};

// Get all members from non-private teams the user belongs to for dynamic link creation.
// Only includes users who have allowDynamicBooking enabled.
export const listMembersForDynamicLinkHandler = async ({ ctx, input }: GetOptions) => {
  const userId = ctx.user.id;
  const membershipRepository = getMembershipRepository();

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
  // Only includes users who have allowDynamicBooking enabled
  const members = await membershipRepository.findDistinctMembersForDynamicLink({
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

export default listMembersForDynamicLinkHandler;
