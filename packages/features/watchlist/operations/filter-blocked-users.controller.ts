import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";
import type { SpanFn } from "@calcom/features/watchlist/lib/telemetry";

/**
 * User type expected from loadAndValidateUsers.
 */
export interface UserWithEmail {
  id?: number;
  email: string;
  username: string | null;
  locked: boolean;
}

export interface FilterBlockedUsersResult<T extends UserWithEmail> {
  eligibleUsers: T[];
  blockedCount: number;
}

/**
 * Filter out blocked users from a list using batched watchlist check.
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

    // First, filter out locked users (immediate block)
    const nonLockedUsers = users.filter((user) => !user.locked);
    const lockedCount = users.length - nonLockedUsers.length;

    if (nonLockedUsers.length === 0) {
      return { eligibleUsers: [], blockedCount: users.length };
    }

    const watchlist = await getWatchlistFeature();
    const emails = nonLockedUsers.map((u) => u.email);

    // Batch check - single DB query for all users
    const globalBlockedMap = await watchlist.globalBlocking.areBlocked(emails);

    let orgBlockedMap: Map<string, { isBlocked: boolean }> | null = null;
    if (organizationId) {
      orgBlockedMap = await watchlist.orgBlocking.areBlocked(emails, organizationId);
    }

    // Filter out blocked users
    const eligibleUsers = nonLockedUsers.filter((user) => {
      const email = user.email.toLowerCase();

      const globalResult = globalBlockedMap.get(email);
      if (globalResult?.isBlocked) {
        return false;
      }

      if (orgBlockedMap) {
        const orgResult = orgBlockedMap.get(email);
        if (orgResult?.isBlocked) {
          return false;
        }
      }

      return true;
    });

    const watchlistBlockedCount = nonLockedUsers.length - eligibleUsers.length;

    return {
      eligibleUsers,
      blockedCount: lockedCount + watchlistBlockedCount,
    };
  };

  if (!span) {
    return execute();
  }

  return span({ name: "filterBlockedUsers Controller" }, execute);
}
