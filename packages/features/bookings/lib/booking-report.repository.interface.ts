import type { ReportReason } from "@calcom/prisma/enums";

export interface CreateBookingReportInput {
  bookingId: number;
  bookerEmail: string | null;
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

export interface IBookingReportRepository {
  createReport(input: CreateBookingReportInput): Promise<{ id: string }>;

  findReportForBooking(bookingId: number): Promise<BookingReportSummary | null>;


  findAllReportedBookings(params: {
    skip?: number;
    take?: number;
  }): Promise<BookingReportSummary[]>;
}
