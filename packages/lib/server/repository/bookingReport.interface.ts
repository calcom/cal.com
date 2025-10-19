import type { BookingReportReason } from "@calcom/prisma/enums";

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

export interface IBookingReportRepository {
  createReport(input: CreateBookingReportInput): Promise<{ id: string }>;

  findAllReportedBookings(params: { skip?: number; take?: number }): Promise<BookingReportSummary[]>;

  findReportsForOrganization(params: {
    organizationId: number;
    limit: number;
    offset: number;
    searchTerm?: string;
  }): Promise<{
    rows: Array<{
      id: string;
      bookerEmail: string;
      reason: BookingReportReason;
      createdAt: Date;
      booking: { title: string; startTime: Date } | null;
      reportedBy: { id: number; name: string | null; email: string } | null;
    }>;
    meta: { totalRowCount: number };
  }>;

  markReportAsHandled(reportId: string): Promise<void>;
}
