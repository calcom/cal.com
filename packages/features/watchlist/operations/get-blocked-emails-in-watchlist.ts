import { startSpan } from "@sentry/nextjs";

import { WatchlistType } from "@calcom/prisma/enums";

import type { Watchlist } from "../watchlist.model";
import { WatchlistRepository } from "../watchlist.repository";

function presenter(watchlistedEmails: Watchlist[] | null) {
  return startSpan({ name: "getBlockedEmailsInWatchlist Presenter", op: "serialize" }, () => {
    const blockedEmailsAndDomains: { emails: string[]; domains: string[] } = { emails: [], domains: [] };
    if (!watchlistedEmails) return blockedEmailsAndDomains;

    for (const watchlistedEmail of watchlistedEmails) {
      if (watchlistedEmail.type === WatchlistType.EMAIL)
        blockedEmailsAndDomains.emails.push(watchlistedEmail.value);
      if (watchlistedEmail.type === WatchlistType.DOMAIN)
        blockedEmailsAndDomains.domains.push(watchlistedEmail.value);
    }
    return blockedEmailsAndDomains;
  });
}

export async function getBlockedEmailsInWatchlist(emails: string[]): Promise<ReturnType<typeof presenter>> {
  return await startSpan({ name: "getBlockedEmailsInWatchlist Controller" }, async () => {
    const lowercasedEmails = emails.map((email) => email.toLowerCase());
    const watchlistRepository = new WatchlistRepository();
    const watchlistedEmails = await watchlistRepository.getBlockedEmailsAndDomains(lowercasedEmails);
    return presenter(watchlistedEmails);
  });
}
