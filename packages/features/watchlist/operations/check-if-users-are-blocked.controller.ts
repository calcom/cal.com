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
  if (users.some((user) => user.locked)) {
    return presenter(true);
  }

  const watchlist = await getWatchlistFeature();

  for (const user of users) {
    if (!user.email) continue;
    const normalizedEmail = normalizeEmail(user.email);

    const globalResult = await watchlist.globalBlocking.isBlocked(normalizedEmail);
    if (globalResult.isBlocked) {
      return presenter(true);
    }

    if (organizationId) {
      const orgResult = await watchlist.orgBlocking.isBlocked(normalizedEmail, organizationId);
      if (orgResult.isBlocked) {
        return presenter(true);
      }
    }
  }

  return presenter(false);
}
