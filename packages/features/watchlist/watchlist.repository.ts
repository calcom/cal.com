import { captureException } from "@sentry/nextjs";

import db from "@calcom/prisma";
import { WatchlistType, WatchlistSeverity } from "@calcom/prisma/enums";

import type { IWatchlistRepository } from "./watchlist.repository.interface";

export class WatchlistRepository implements IWatchlistRepository {
  async getBlockedEmailInWatchlist(email: string) {
    const [, domain] = email.split("@");
    try {
      const emailInWatchlist = await db.watchlist.findFirst({
        where: {
          severity: WatchlistSeverity.CRITICAL,
          OR: [
            { type: WatchlistType.EMAIL, value: email },
            { type: WatchlistType.DOMAIN, value: domain },
          ],
        },
      });
      return emailInWatchlist;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async getFreeEmailDomainInWatchlist(emailDomain: string) {
    try {
      const domainInWatchWatchlist = await db.watchlist.findFirst({
        where: {
          type: WatchlistType.DOMAIN,
          value: emailDomain,
        },
      });
      return domainInWatchWatchlist;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async getBlockedEmailsAndDomains(emails: string[]) {
    try {
      const domains = emails.map((email) => email.split("@")[1]);
      const blockedEmailsAndDomains = await db.watchlist.findMany({
        where: {
          severity: WatchlistSeverity.CRITICAL,
          OR: [
            { type: WatchlistType.EMAIL, value: { in: emails } },
            { type: WatchlistType.DOMAIN, value: { in: domains } },
          ],
        },
      });
      return blockedEmailsAndDomains;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
