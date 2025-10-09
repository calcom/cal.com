import type { ReportReason, WatchlistType, WatchlistAction } from "@calcom/prisma/enums";

export interface CreateBookingReportInput {
  bookingId: number;
  bookerEmail: string;
  reportedById: number;
  reason: ReportReason;
  description?: string;
  cancelled: boolean;
}

export interface BookingReportSummary {
  id: string;
  reportedById: number;
  reason: ReportReason;
  description: string | null;
  createdAt: Date;
}

export interface BookingReportWithDetails {
  id: string;
  bookingId: number;
  bookerEmail: string;
  reportedById: number;
  reason: ReportReason;
  description: string | null;
  cancelled: boolean;
  createdAt: Date;
  watchlistId: string | null;

  reporter: {
    id: number;
    name: string | null;
    email: string;
  };
  booking: {
    id: number;
    startTime: Date;
    endTime: Date;
    title: string | null;
    uid: string;
  };
  watchlist: {
    id: string;
    type: WatchlistType;
    value: string;
    action: WatchlistAction;
    description: string | null;
  } | null;
}

export interface ListBookingReportsFilters {
  reason?: ReportReason[];
  cancelled?: boolean;
  hasWatchlist?: boolean;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

export interface IBookingReportRepository {
  createReport(input: CreateBookingReportInput): Promise<{ id: string }>;

  findReportForBooking(bookingId: number): Promise<BookingReportSummary | null>;

  findAllReportedBookings(params: {
    organizationId: number;
    skip?: number;
    take?: number;
    searchTerm?: string;
    filters?: ListBookingReportsFilters;
  }): Promise<{
    rows: BookingReportWithDetails[];
    meta: { totalRowCount: number };
  }>;

  linkWatchlistToReport(params: { reportId: string; watchlistId: string }): Promise<void>;
}
