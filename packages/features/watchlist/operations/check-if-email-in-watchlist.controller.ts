import { startSpan } from "@sentry/nextjs";

import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";

import type { EmailBlockedCheckResponseDTO } from "../lib/dto";
import { normalizeEmail } from "../lib/utils/normalization";

/**
 * Controllers use Presenters to convert the data to a UI-friendly format just before
 * returning it to the "consumer". This helps us ship less JavaScript to the client (logic
 * and libraries to convert the data), helps prevent leaking any sensitive properties, like
 * emails or hashed passwords, and also helps us slim down the amount of data we're sending
 * back to the client.
 */
function presenter(isBlocked: boolean): EmailBlockedCheckResponseDTO {
  return startSpan({ name: "checkIfEmailInWatchlist Presenter", op: "serialize" }, () => {
    return { isBlocked };
  });
}

/**
 * Controllers perform authentication checks and input validation before passing the input
 * to the specific use cases. Controllers orchestrate Use Cases. They don't implement any
 * logic, but define the whole operations using use cases.
 */
export async function checkIfEmailIsBlockedInWatchlistController(
  email: string,
  organizationId?: number
): Promise<EmailBlockedCheckResponseDTO> {
  return await startSpan({ name: "checkIfEmailInWatchlist Controller" }, async () => {
    // Normalize email
    const normalizedEmail = normalizeEmail(email);

    // Use façade for clean DX
    const watchlist = getWatchlistFeature();

    // Check global entries first
    const globalResult = await watchlist.globalBlocking.isBlocked(normalizedEmail, organizationId);
    if (globalResult.isBlocked) {
      return presenter(true);
    }

    // Check organization entries
    if (organizationId) {
      const orgResult = await watchlist.orgBlocking.isEmailBlocked(normalizedEmail, organizationId);
      if (orgResult.isBlocked) {
        return presenter(true);
      }
    }

    return presenter(false);
  });
}
