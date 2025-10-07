import type { ReportReason } from "@calcom/prisma/enums";

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
  createdAt: Date;
}

export interface IBookingReportRepository {
  /**
   * Creates a new booking report
   */
  createReport(input: CreateBookingReportInput): Promise<{ id: string }>;

  /**
   * Finds a report by a specific user for a specific booking
   */
  findUserReport(bookingId: number, userId: number): Promise<BookingReportSummary | null>;

  /**
   * Finds all reports for a specific booking
   */
  findAllReportsForBooking(bookingId: number): Promise<BookingReportSummary[]>;

  /**
   * Checks if a user has reported any booking in a recurring series
   */
  hasUserReportedSeries(recurringEventId: string, userId: number): Promise<boolean>;
}
