import type { BookingReportReason, BookingReportStatus, SystemReportStatus } from "@calcom/prisma/enums";

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

export interface ListBookingReportsFilters {
  reason?: BookingReportReason[];
  cancelled?: boolean;
  hasWatchlist?: boolean;
  status?: BookingReportStatus[];
}

export interface SystemBookingReportsFilters {
  systemStatus?: SystemReportStatus[];
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
  status: BookingReportStatus;
  systemStatus: SystemReportStatus;
  watchlistId: string | null;
  globalWatchlistId: string | null;
  organizationId: number | null;
  reporter: {
    id: number;
    email: string;
    name: string | null;
  } | null;
  booking: {
    id: number;
    uid: string;
    title: string | null;
    startTime: Date;
    endTime: Date;
  };
  watchlist: {
    id: string;
    type: string;
    value: string;
    action: string;
    description: string | null;
  } | null;
  globalWatchlist: {
    id: string;
    type: string;
    value: string;
    action: string;
    description: string | null;
  } | null;
  organization: {
    id: number;
    name: string;
    slug: string | null;
  } | null;
}

export interface GroupedBookingReportWithDetails extends BookingReportWithDetails {
  reportCount: number;
  reports: BookingReportWithDetails[];
}

export interface IBookingReportRepository {
  createReport(input: CreateBookingReportInput): Promise<{ id: string }>;

  findAllReportedBookings(params: {
    organizationId?: number;
    skip?: number;
    take?: number;
    searchTerm?: string;
    filters?: ListBookingReportsFilters;
  }): Promise<{
    rows: BookingReportWithDetails[];
    meta: { totalRowCount: number };
  }>;

  findGroupedReportedBookings(params: {
    organizationId?: number;
    skip?: number;
    take?: number;
    searchTerm?: string;
    filters?: ListBookingReportsFilters;
    systemFilters?: SystemBookingReportsFilters;
  }): Promise<{
    rows: GroupedBookingReportWithDetails[];
    meta: { totalRowCount: number };
  }>;

  findReportsByIds(params: {
    reportIds: string[];
    organizationId?: number;
  }): Promise<BookingReportWithDetails[]>;

  linkWatchlistToReport(params: { reportId: string; watchlistId: string }): Promise<void>;

  updateReportStatus(params: {
    reportId: string;
    status: BookingReportStatus;
    organizationId?: number;
  }): Promise<void>;

  bulkLinkWatchlistWithStatus(params: {
    links: Array<{ reportId: string; watchlistId: string }>;
    status: BookingReportStatus;
  }): Promise<void>;

  bulkLinkGlobalWatchlistWithSystemStatus(params: {
    links: Array<{ reportId: string; globalWatchlistId: string }>;
    systemStatus: SystemReportStatus;
  }): Promise<void>;

  countPendingReports(params: { organizationId: number }): Promise<number>;

  updateSystemReportStatus(params: {
    reportId: string;
    systemStatus: SystemReportStatus;
    globalWatchlistId?: string | null;
  }): Promise<void>;

  bulkUpdateSystemReportStatus(params: {
    reportIds: string[];
    systemStatus: SystemReportStatus;
    globalWatchlistId?: string | null;
  }): Promise<{ updated: number }>;

  countSystemPendingReports(): Promise<number>;

  dismissReportsByEmail(params: {
    email: string;
    status: BookingReportStatus;
    organizationId: number;
  }): Promise<{ count: number }>;

  dismissSystemReportsByEmail(params: {
    email: string;
    systemStatus: SystemReportStatus;
  }): Promise<{ count: number }>;

  findPendingReportsByEmail(params: {
    email: string;
    organizationId: number;
  }): Promise<Array<{ id: string; bookerEmail: string; watchlistId: string | null }>>;

  findPendingReportsByDomain(params: {
    domain: string;
    organizationId: number;
  }): Promise<Array<{ id: string; bookerEmail: string; watchlistId: string | null }>>;

  findPendingSystemReportsByEmail(params: {
    email: string;
  }): Promise<Array<{ id: string; bookerEmail: string; globalWatchlistId: string | null }>>;

  findPendingSystemReportsByDomain(params: {
    domain: string;
  }): Promise<Array<{ id: string; bookerEmail: string; globalWatchlistId: string | null }>>;
}
