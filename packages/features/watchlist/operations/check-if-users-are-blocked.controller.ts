import { startSpan } from "@sentry/nextjs";

import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";
import { normalizeEmail } from "@calcom/features/watchlist/lib/utils/normalization";

function presenter(containsBlockedUser: boolean) {
  return startSpan({ name: "checkIfUsersAreBlocked Presenter", op: "serialize" }, () => {
    return !!containsBlockedUser;
  });
}

export async function checkIfUsersAreBlocked(
  users: { email: string; username: string | null; locked: boolean }[]
): Promise<ReturnType<typeof presenter>> {
  // If any user is locked, return true immediately
  if (users.some((user) => user.locked)) {
    return presenter(true);
  }

  // Use façade for clean DX - only check global blocking since no organizationId context
  const watchlist = getWatchlistFeature();

  // Check each user's email for global blocking
  for (const user of users) {
    const normalizedEmail = normalizeEmail(user.email);
    const result = await watchlist.globalBlocking.isBlocked(normalizedEmail);
    if (result.isBlocked) {
      return presenter(true);
    }
  }

  return presenter(false);
}
