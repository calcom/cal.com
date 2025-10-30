import type { PrismaClient } from "@calcom/prisma";

import type {
  IBookingReportRepository,
  CreateBookingReportInput,
  BookingReportSummary,
} from "./bookingReport.interface";

export class PrismaBookingReportRepository implements IBookingReportRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async createReport(input: CreateBookingReportInput): Promise<{ id: string }> {
    const report = await this.prismaClient.bookingReport.create({
      data: {
        bookingUid: input.bookingUid,
        bookerEmail: input.bookerEmail,
        reportedById: input.reportedById,
        reason: input.reason,
        description: input.description,
        cancelled: input.cancelled,
        organizationId: input.organizationId,
      },
      select: { id: true },
    });
    return report;
  }

  async findAllReportedBookings(params: { skip?: number; take?: number }): Promise<BookingReportSummary[]> {
    const reports = await this.prismaClient.bookingReport.findMany({
      skip: params.skip,
      take: params.take,
      select: {
        id: true,
        reportedById: true,
        reason: true,
        description: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return reports;
  }
}
