import { getMembershipRepository } from "@calcom/features/di/containers/MembershipRepository";
import type { TSearchUsersByEmailInput } from "./searchUsersByEmail.schema";

type SearchUsersByEmailOptions = {
  input: TSearchUsersByEmailInput;
};

export const searchUsersByEmailHandler = async ({ input }: SearchUsersByEmailOptions) => {
  const { teamId, query, cursor, limit } = input;
  const membershipRepository = getMembershipRepository();

  const memberships = await membershipRepository.searchByTeamIdAndEmailPrefix({
    teamId,
    emailPrefix: query,
    cursor,
    limit,
  });

  const hasMore = memberships.length > limit;
  const results = hasMore ? memberships.slice(0, limit) : memberships;
  const users = results.map((m) => m.user);
  const nextCursor = hasMore ? users[users.length - 1].id : null;

  return { users, nextCursor };
};

export default searchUsersByEmailHandler;
