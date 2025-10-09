import { startSpan } from "@sentry/nextjs";

import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";
import { normalizeEmail } from "@calcom/features/watchlist/lib/utils/normalization";

function presenter(containsBlockedUser: boolean) {
  return startSpan({ name: "checkIfUsersAreBlocked Presenter", op: "serialize" }, async () => {
    return !!containsBlockedUser;
  });
}

export async function checkIfUsersAreBlocked(
  users: { email: string; username: string | null; locked: boolean }[],
  organizationId?: number
): Promise<ReturnType<typeof presenter>> {
  // If any user is locked, return true immediately
  if (users.some((user) => user.locked)) {
    return presenter(true);
  }

  // Use façade for clean DX - check both global and org-specific blocking
  const watchlist = await getWatchlistFeature();

  // Check each user's email for blocking
  for (const user of users) {
    if (!user.email) continue; // Skip users without email
    const normalizedEmail = normalizeEmail(user.email);

    // Check global blocking first
    const globalResult = await watchlist.globalBlocking.isBlocked(normalizedEmail, organizationId);
    if (globalResult.isBlocked) {
      return presenter(true);
    }

    // Check org-specific blocking if organizationId is provided
    if (organizationId) {
      const orgResult = await watchlist.orgBlocking.isEmailBlocked(normalizedEmail, organizationId);
      if (orgResult.isBlocked) {
        return presenter(true);
      }
    }
  }

  return presenter(false);
}
