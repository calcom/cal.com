import { startSpan } from "@sentry/nextjs";

import {
  getGlobalWatchlistRepository,
  getOrganizationWatchlistRepository,
} from "@calcom/features/di/watchlist/containers/watchlist";

import type { EmailBlockedCheckResponseDTO } from "../lib/dto";

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
    const lowercasedEmail = email.toLowerCase();

    // Check global entries first
    const globalRepo = getGlobalWatchlistRepository();
    const globalEntry = await globalRepo.findBlockedEmail(lowercasedEmail);
    if (globalEntry) {
      return presenter(true);
    }

    // Check organization entries if organizationId provided
    if (organizationId) {
      const orgRepo = getOrganizationWatchlistRepository();
      const orgEntry = await orgRepo.findBlockedEmail(lowercasedEmail, organizationId);
      if (orgEntry) {
        return presenter(true);
      }
    }

    return presenter(false);
  });
}
