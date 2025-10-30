import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/generated/prisma/client";

import type {
  IBookingReportRepository,
  CreateBookingReportInput,
  BookingReportWithDetails,
  ListBookingReportsFilters,
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

  async findAllReportedBookings(params: {
    organizationId?: number;
    skip?: number;
    take?: number;
    searchTerm?: string;
    filters?: ListBookingReportsFilters;
  }): Promise<{
    rows: BookingReportWithDetails[];
    meta: { totalRowCount: number };
  }> {
    const where: Prisma.BookingReportWhereInput = {};

    if (params.organizationId) {
      where.organizationId = params.organizationId;
    }

    if (params.searchTerm) {
      where.OR = [
        { bookerEmail: { contains: params.searchTerm, mode: "insensitive" } },
        {
          reportedBy: {
            email: { contains: params.searchTerm, mode: "insensitive" },
          },
        },
      ];
    }

    if (params.filters?.hasWatchlist !== undefined) {
      where.watchlistId = params.filters.hasWatchlist ? { not: null } : null;
    }

    if (params.filters?.reason && params.filters.reason.length > 0) {
      where.reason = { in: params.filters.reason };
    }

    if (params.filters?.cancelled !== undefined) {
      where.cancelled = params.filters.cancelled;
    }

    if (params.filters?.status && params.filters.status.length > 0) {
      where.status = { in: params.filters.status };
    }

    const [reports, totalCount] = await Promise.all([
      this.prismaClient.bookingReport.findMany({
        where,
        skip: params.skip,
        take: params.take,
        select: {
          id: true,
          bookingUid: true,
          bookerEmail: true,
          reportedById: true,
          reason: true,
          description: true,
          cancelled: true,
          createdAt: true,
          status: true,
          watchlistId: true,
          reportedBy: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          booking: {
            select: {
              id: true,
              uid: true,
              title: true,
              startTime: true,
              endTime: true,
            },
          },
          watchlist: {
            select: {
              id: true,
              type: true,
              value: true,
              action: true,
              description: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prismaClient.bookingReport.count({ where }),
    ]);

    const rows = reports.map((report) => ({
      ...report,
      reporter: report.reportedBy,
    }));

    return {
      rows,
      meta: { totalRowCount: totalCount },
    };
  }

  async findReportsByIds(params: {
    reportIds: string[];
    organizationId?: number;
  }): Promise<BookingReportWithDetails[]> {
    const where: Prisma.BookingReportWhereInput = {
      id: { in: params.reportIds },
    };

    if (params.organizationId) {
      where.organizationId = params.organizationId;
    }

    const reports = await this.prismaClient.bookingReport.findMany({
      where,
      select: {
        id: true,
        bookingUid: true,
        bookerEmail: true,
        reportedById: true,
        reason: true,
        description: true,
        cancelled: true,
        createdAt: true,
        status: true,
        watchlistId: true,
        reportedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        booking: {
          select: {
            id: true,
            uid: true,
            title: true,
            startTime: true,
            endTime: true,
          },
        },
        watchlist: {
          select: {
            id: true,
            type: true,
            value: true,
            action: true,
            description: true,
          },
        },
      },
    });

    return reports.map((report) => ({
      ...report,
      reporter: report.reportedBy,
    }));
  }

  async linkWatchlistToReport(params: { reportId: string; watchlistId: string }): Promise<void> {
    await this.prismaClient.bookingReport.update({
      where: { id: params.reportId },
      data: { watchlistId: params.watchlistId },
    });
  }

  async updateReportStatus(params: {
    reportId: string;
    status: "PENDING" | "DISMISSED" | "BLOCKED";
    organizationId?: number;
  }): Promise<void> {
    const where: Prisma.BookingReportWhereInput = {
      id: params.reportId,
    };

    if (params.organizationId) {
      where.organizationId = params.organizationId;
    }

    await this.prismaClient.bookingReport.updateMany({
      where,
      data: { status: params.status },
    });
  }
}
