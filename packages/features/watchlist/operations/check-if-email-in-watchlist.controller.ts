import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";

import type { SpanFn } from "../lib/telemetry";
import { normalizeEmail } from "../lib/utils/normalization";

interface CheckEmailBlockedParams {
  email: string;
  organizationId?: number | null;
  span?: SpanFn;
}

function presenter(isBlocked: boolean, span?: SpanFn): Promise<boolean> {
  if (!span) {
    return Promise.resolve(isBlocked);
  }
  return span({ name: "checkIfEmailInWatchlist Presenter", op: "serialize" }, () => isBlocked);
}

/**
 * Controllers perform auth/validation and orchestrate use-cases.
 * Uses DI container for proper dependency management.
 */
export async function checkIfEmailIsBlockedInWatchlistController(
  params: CheckEmailBlockedParams
): Promise<boolean> {
  const { email, organizationId, span } = params;

  const execute = async () => {
    const normalizedEmail = normalizeEmail(email);

    const watchlist = await getWatchlistFeature();

    const globalResult = await watchlist.globalBlocking.isBlocked(normalizedEmail);
    if (globalResult.isBlocked) {
      return presenter(true, span);
    }

    if (organizationId != null) {
      const orgResult = await watchlist.orgBlocking.isBlocked(normalizedEmail, organizationId);
      if (orgResult.isBlocked) {
        return presenter(true, span);
      }
    }

    return presenter(false, span);
  };

  if (!span) {
    return execute();
  }

  return span({ name: "checkIfEmailInWatchlist Controller" }, execute);
}
