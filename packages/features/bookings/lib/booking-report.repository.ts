import { captureException } from "@sentry/nextjs";

import type { PrismaClient } from "@calcom/prisma";
import type { ReportReason } from "@calcom/prisma/enums";

import type {
  BookingReportSummary,
  CreateBookingReportInput,
  IBookingReportRepository,
} from "./booking-report.repository.interface";

export class BookingReportRepository implements IBookingReportRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  /**
   * Creates a new booking report
   */
  async createReport(input: CreateBookingReportInput): Promise<{ id: string }> {
    try {
      const report = await this.prismaClient.bookingReport.create({
        data: {
          bookingId: input.bookingId,
          bookerEmail: input.bookerEmail,
          reportedById: input.reportedById,
          reason: input.reason,
          description: input.description,
          cancelled: input.cancelled,
        },
        select: {
          id: true,
        },
      });
      return report;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Finds a report by a specific user for a specific booking
   * Uses the composite unique constraint (bookingId, reportedById)
   */
  async findUserReport(bookingId: number, userId: number): Promise<BookingReportSummary | null> {
    try {
      const report = await this.prismaClient.bookingReport.findUnique({
        where: {
          bookingId_reportedById: {
            bookingId,
            reportedById: userId,
          },
        },
        select: {
          id: true,
          reportedById: true,
          reason: true,
          createdAt: true,
        },
      });
      return report;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Finds all reports for a specific booking
   */
  async findAllReportsForBooking(bookingId: number): Promise<BookingReportSummary[]> {
    try {
      const reports = await this.prismaClient.bookingReport.findMany({
        where: {
          bookingId,
        },
        select: {
          id: true,
          reportedById: true,
          reason: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });
      return reports;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Checks if a user has reported any booking in a recurring series
   */
  async hasUserReportedSeries(recurringEventId: string, userId: number): Promise<boolean> {
    try {
      const report = await this.prismaClient.bookingReport.findFirst({
        where: {
          reportedById: userId,
          booking: {
            recurringEventId,
          },
        },
        select: {
          id: true,
        },
      });
      return !!report;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
