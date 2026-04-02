import type { SpanFn } from "@calcom/features/watchlist/lib/telemetry";
import type { BlockableUser } from "./check-user-blocking";
import { getBlockedUsersMap, isUserBlocked } from "./check-user-blocking";

/**
 * User type expected from loadAndValidateUsers.
 */
export interface UserWithEmail extends BlockableUser {
  id?: number;
  username: string | null;
}

export interface FilterBlockedUsersResult<T extends UserWithEmail> {
  eligibleUsers: T[];
  blockedCount: number;
}

/**
 * Filter out blocked users from a list using batched blocking check.
 * Checks both locked users and watchlist-blocked emails.
 * Single DB query for N users - eliminates N+1.
 *
 * @param users - List of users to filter
 * @param organizationId - Optional organization ID for org-specific blocking
 * @param span - Optional tracing span
 * @returns Object with eligibleUsers and blockedCount
 */
export async function filterBlockedUsers<T extends UserWithEmail>(
  users: T[],
  organizationId?: number | null,
  span?: SpanFn
): Promise<FilterBlockedUsersResult<T>> {
  const execute = async (): Promise<FilterBlockedUsersResult<T>> => {
    if (users.length === 0) {
      return { eligibleUsers: [], blockedCount: 0 };
    }

    // Get blocking map (handles locked users and watchlist in one call)
    const { blockingMap, blockedCount } = await getBlockedUsersMap(users, organizationId);

    // Filter out blocked users
    const eligibleUsers = users.filter((user) => !isUserBlocked(user.email, blockingMap));

    return {
      eligibleUsers,
      blockedCount,
    };
  };

  if (!span) {
    return execute();
  }

  return span({ name: "filterBlockedUsers Controller" }, execute);
}
