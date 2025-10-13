import { captureException } from "@sentry/nextjs";

import db from "@calcom/prisma";
import { WatchlistType } from "@calcom/prisma/enums";

import type { IWatchlistRepository } from "./watchlist.repository.interface";

export class WatchlistRepository implements IWatchlistRepository {
  async getBlockedEmailInWatchlist(email: string) {
    const [, domain] = email.split("@");
    try {
      const emailInWatchlist = await db.watchlist.findFirst({
        where: {
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

  /** Returns a boolean if any of the users passed are blocked */
  async searchForAllBlockedRecords({
    usernames,
    emails,
    domains,
  }: {
    usernames: string[];
    emails: string[];
    domains: string[];
  }) {
    try {
      const blockedRecords = await db.watchlist.findMany({
        where: {
          OR: [
            ...(usernames.length > 0
              ? [
                  {
                    type: WatchlistType.USERNAME,
                    value: {
                      in: usernames,
                    },
                  },
                ]
              : []),
            ...(emails.length > 0
              ? [
                  {
                    type: WatchlistType.EMAIL,
                    value: {
                      in: emails,
                    },
                  },
                ]
              : []),
            ...(domains.length > 0
              ? [
                  {
                    type: WatchlistType.DOMAIN,
                    value: {
                      in: domains,
                    },
                  },
                ]
              : []),
          ],
        },
      });
      return blockedRecords;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
