import { startSpan } from "@sentry/nextjs";

import type { Blacklist } from "../blacklist.model";
import { BlacklistRepository } from "../blacklist.repository";

/**
 * Controllers use Presenters to convert the data to a UI-friendly format just before
 * returning it to the "consumer". This helps us ship less JavaScript to the client (logic
 * and libraries to convert the data), helps prevent leaking any sensitive properties, like
 * emails or hashed passwords, and also helps us slim down the amount of data we're sending
 * back to the client.
 */
function presenter(blacklistedEmail: Blacklist | null) {
  return startSpan({ name: "checkIfEmailInBlacklist Presenter", op: "serialize" }, () => {
    return !!blacklistedEmail;
  });
}

/**
 * Controllers perform authentication checks and input validation before passing the input
 * to the specific use cases. Controllers orchestrate Use Cases. They don't implement any
 * logic, but define the whole operations using use cases.
 */
export async function checkIfEmailInBlacklistController(
  email: string
): Promise<ReturnType<typeof presenter>> {
  return await startSpan({ name: "checkIfEmailInBlacklist Controller" }, async () => {
    const blacklistRepository = new BlacklistRepository();
    const blacklistedEmail = await blacklistRepository.getEmailInBlacklist(email);
    return presenter(blacklistedEmail);
  });
}
