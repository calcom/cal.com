import { startSpan } from "@sentry/nextjs";

import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";

import type { EmailBlockedCheckResponseDTO } from "../lib/dto";
import { normalizeEmail } from "../lib/utils/normalization";

function presenter(isBlocked: boolean): EmailBlockedCheckResponseDTO {
  return startSpan({ name: "checkIfEmailInWatchlist Presenter", op: "serialize" }, () => {
    return { isBlocked };
  });
}

interface CheckEmailBlockedParams {
  email: string;
  organizationId?: number | null;
}

/**
 * Controllers perform auth/validation and orchestrate use-cases.
 * Uses DI container for proper dependency management.
 */
export async function checkIfEmailIsBlockedInWatchlistController(
  params: CheckEmailBlockedParams
): Promise<EmailBlockedCheckResponseDTO> {
  return await startSpan({ name: "checkIfEmailInWatchlist Controller" }, async () => {
    const { email, organizationId } = params;
    const normalizedEmail = normalizeEmail(email);

    const watchlist = await getWatchlistFeature();

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

    return presenter(false);
  });
}
