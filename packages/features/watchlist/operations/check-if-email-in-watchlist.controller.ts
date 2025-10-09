import { startSpan } from "@sentry/nextjs";

import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";

import type { EmailBlockedCheckResponseDTO } from "../lib/dto";
import { normalizeEmail } from "../lib/utils/normalization";

function presenter(isBlocked: boolean): EmailBlockedCheckResponseDTO {
  return startSpan({ name: "checkIfEmailInWatchlist Presenter", op: "serialize" }, () => {
    return { isBlocked };
  });
}

/**
 * Controllers perform auth/validation and orchestrate use-cases.
 * Uses DI container for proper dependency management.
 */
export async function checkIfEmailIsBlockedInWatchlistController(
  email: string,
  organizationId?: number
): Promise<EmailBlockedCheckResponseDTO> {
  return await startSpan({ name: "checkIfEmailInWatchlist Controller" }, async () => {
    const normalizedEmail = normalizeEmail(email);

    // Get the watchlist feature through DI
    const watchlist = await getWatchlistFeature();

    // Global first
    const globalResult = await watchlist.globalBlocking.isBlocked(normalizedEmail, organizationId);
    if (globalResult.isBlocked) {
      return presenter(true);
    }

    // Then org
    if (organizationId) {
      const orgResult = await watchlist.orgBlocking.isEmailBlocked(normalizedEmail, organizationId);
      if (orgResult.isBlocked) {
        return presenter(true);
      }
    }

    return presenter(false);
  });
}
