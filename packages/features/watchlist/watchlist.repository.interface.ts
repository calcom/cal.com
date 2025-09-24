import type { ReportReason } from "@calcom/prisma/enums";

import type { Watchlist } from "./watchlist.model";

export interface IWatchlistRepository {
  getBlockedEmailInWatchlist(email: string): Promise<Watchlist | null>;
  createBookingReport(params: {
    bookingId: number;
    reportedById: number;
    reason: ReportReason;
    description?: string;
    cancelled: boolean;
    organizationId?: number;
  }): Promise<{ watchlistEntry: unknown; reportLog: unknown }>;
  isBookingReported(bookingId: number): Promise<boolean>;
  getBookingReport(bookingId: number): Promise<unknown>;
}
