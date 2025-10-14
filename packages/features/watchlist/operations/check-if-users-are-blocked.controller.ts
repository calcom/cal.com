import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";
import type { SpanFn } from "@calcom/features/watchlist/lib/telemetry";
import { normalizeEmail } from "@calcom/features/watchlist/lib/utils/normalization";

function presenter(containsBlockedUser: boolean, span?: SpanFn): Promise<boolean> {
  const result = !!containsBlockedUser;
  if (!span) {
    return Promise.resolve(result);
  }
  return span({ name: "checkIfUsersAreBlocked Presenter", op: "serialize" }, () => result);
}

interface CheckUsersBlockedParams {
  users: { email: string; username: string | null; locked: boolean }[];
  organizationId?: number | null;
  span?: SpanFn;
}

export async function checkIfUsersAreBlocked(params: CheckUsersBlockedParams): Promise<boolean> {
  const { users, organizationId, span } = params;
  const execute = async () => {
    if (users.some((user) => user.locked)) {
      return presenter(true, span);
    }

    const watchlist = await getWatchlistFeature();

    for (const user of users) {
      if (!user.email) continue;
      const normalizedEmail = normalizeEmail(user.email);

      const globalResult = await watchlist.globalBlocking.isBlocked(normalizedEmail);
      if (globalResult.isBlocked) {
        return presenter(true, span);
      }

      if (organizationId) {
        const orgResult = await watchlist.orgBlocking.isBlocked(normalizedEmail, organizationId);
        if (orgResult.isBlocked) {
          return presenter(true, span);
        }
      }
    }

    return presenter(false, span);
  };

  if (!span) {
    return execute();
  }

  return span({ name: "checkIfUsersAreBlocked Controller" }, execute);
}
