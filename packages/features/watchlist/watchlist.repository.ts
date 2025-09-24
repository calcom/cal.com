import { captureException } from "@sentry/nextjs";

import db from "@calcom/prisma";
import type { ReportReason } from "@calcom/prisma/enums";
import { WatchlistType, WatchlistSeverity, WatchlistAction } from "@calcom/prisma/enums";

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
          severity: WatchlistSeverity.CRITICAL,
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

  async createBookingReport({
    bookingId,
    reportedById,
    reason,
    description,
    cancelled,
    organizationId,
  }: {
    bookingId: number;
    reportedById: number;
    reason: ReportReason;
    description?: string;
    cancelled: boolean;
    organizationId?: number;
  }) {
    try {
      return await db.$transaction(async (tx) => {
        const watchlistEntry = await tx.watchlist.create({
          data: {
            type: WatchlistType.BOOKING_REPORT,
            value: bookingId.toString(),
            description: `${reason}: ${description || ""}`,
            action: WatchlistAction.REPORT,
            severity: WatchlistSeverity.LOW,
            createdById: reportedById,
            organizationId,
          },
        });

        const reportLog = await tx.bookingReportLog.create({
          data: {
            bookingId,
            reportedById,
            reason,
            cancelled,
            watchlistId: watchlistEntry.id,
          },
        });

        return { watchlistEntry, reportLog };
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async isBookingReported(bookingId: number): Promise<boolean> {
    try {
      const existingReport = await db.bookingReportLog.findUnique({
        where: { bookingId },
      });
      return !!existingReport;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async getBookingReport(bookingId: number) {
    try {
      return await db.bookingReportLog.findUnique({
        where: { bookingId },
        select: {
          id: true,
          bookingId: true,
          reportedById: true,
          reason: true,
          cancelled: true,
          watchlistId: true,
          createdAt: true,
          watchlist: {
            select: {
              id: true,
              type: true,
              value: true,
              description: true,
              action: true,
              severity: true,
              createdAt: true,
            },
          },
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
