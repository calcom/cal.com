import { startSpan } from "@sentry/nextjs";

import { getBlockingService } from "@calcom/features/di/watchlist/containers/watchlist";

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

    // Use unified blocking service (handles global → org priority automatically)
    const blockingService = getBlockingService();
    const result = await blockingService.isBlocked(lowercasedEmail, organizationId);

    return presenter(result.isBlocked);
  });
}
