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

  async findReportsForOrganization(params: {
    organizationId: number;
    limit: number;
    offset: number;
    searchTerm?: string;
  }) {
    const where = {
      organizationId: params.organizationId,
      watchlistId: null,
      ...(params.searchTerm && {
        bookerEmail: { contains: params.searchTerm, mode: "insensitive" as const },
      }),
    };

    const [rows, totalRowCount] = await Promise.all([
      this.prismaClient.bookingReport.findMany({
        where,
        take: params.limit,
        skip: params.offset,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          bookerEmail: true,
          reason: true,
          createdAt: true,
          booking: { select: { title: true, startTime: true } },
          reportedBy: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prismaClient.bookingReport.count({ where }),
    ]);

    return { rows, meta: { totalRowCount } };
  }

  async markReportAsHandled(reportId: string): Promise<void> {
    await this.prismaClient.bookingReport.update({
      where: { id: reportId },
      data: { updatedAt: new Date() },
    });
  }
}
