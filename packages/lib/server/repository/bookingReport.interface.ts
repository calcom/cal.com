import type { BookingReportReason, WatchlistType, WatchlistAction } from "@calcom/prisma/enums";

export interface CreateBookingReportInput {
  bookingUid: string;
  bookerEmail: string;
  reportedById: number;
  reason: BookingReportReason;
  description?: string;
  cancelled: boolean;
  organizationId?: number | null;
}

export interface BookingReportSummary {
  id: string;
  reportedById: number | null;
  reason: BookingReportReason;
  description: string | null;
  createdAt: Date;
}

export interface BookingReportWithDetails {
  id: string;
  bookingUid: string;
  bookerEmail: string;
  reportedById: number | null;
  reason: BookingReportReason;
  description: string | null;
  cancelled: boolean;
  createdAt: Date;
  watchlistId: string | null;

  reporter?: {
    id: number;
    name: string | null;
    email: string;
  } | null;
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
  reason?: BookingReportReason[];
  cancelled?: boolean;
  hasWatchlist?: boolean;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

export interface IBookingReportRepository {
  createReport(input: CreateBookingReportInput): Promise<{ id: string }>;

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

  findReportsByIds(params: {
    reportIds: string[];
    organizationId: number;
  }): Promise<BookingReportWithDetails[]>;

  linkWatchlistToReport(params: { reportId: string; watchlistId: string }): Promise<void>;

  deleteReport(params: { reportId: string; organizationId: number }): Promise<void>;
}
