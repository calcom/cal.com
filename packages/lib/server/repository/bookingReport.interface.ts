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
}
