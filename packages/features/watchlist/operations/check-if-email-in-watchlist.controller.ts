import { startSpan } from "@sentry/nextjs";

import type { Watchlist } from "../watchlist.model";
import { WatchlistRepository } from "../watchlist.repository";

/**
 * Controllers use Presenters to convert the data to a UI-friendly format just before
 * returning it to the "consumer". This helps us ship less JavaScript to the client (logic
 * and libraries to convert the data), helps prevent leaking any sensitive properties, like
 * emails or hashed passwords, and also helps us slim down the amount of data we're sending
 * back to the client.
 */
function presenter(watchlistedEmail: Watchlist | null) {
  return startSpan({ name: "checkIfEmailInWatchlist Presenter", op: "serialize" }, () => {
    return !!watchlistedEmail;
  });
}

/**
 * Controllers perform authentication checks and input validation before passing the input
 * to the specific use cases. Controllers orchestrate Use Cases. They don't implement any
 * logic, but define the whole operations using use cases.
 */
export async function checkIfEmailInWatchlistController(
  email: string
): Promise<ReturnType<typeof presenter>> {
  return await startSpan({ name: "checkIfEmailInWatchlist Controller" }, async () => {
    const lowercasedEmail = email.toLowerCase();
    const watchlistRepository = new WatchlistRepository();
    const watchlistedEmail = await watchlistRepository.getEmailInWatchlist(lowercasedEmail);
    return presenter(watchlistedEmail);
  });
}
