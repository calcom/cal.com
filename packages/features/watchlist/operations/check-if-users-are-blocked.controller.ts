import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";
import type { SpanFn } from "@calcom/features/watchlist/lib/telemetry";
import { normalizeEmail } from "@calcom/features/watchlist/lib/utils/normalization";
import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["watchlist:check-if-users-are-blocked"] });

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

      let normalizedEmail: string;
      try {
        normalizedEmail = normalizeEmail(user.email);
      } catch (error) {
        // If email normalization fails (e.g., email contains characters like % that don't match our regex),
        // log the issue and skip watchlist check for this user. This prevents booking failures
        // when host users have emails with unusual but valid characters.
        log.warn("Failed to normalize email for watchlist check, skipping user", {
          username: user.username,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        continue;
      }

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
