import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

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
    organizationId: number;
    skip?: number;
    take?: number;
    searchTerm?: string;
    filters?: ListBookingReportsFilters;
  }): Promise<{
    rows: BookingReportWithDetails[];
    meta: { totalRowCount: number };
  }> {
    const where: Prisma.BookingReportWhereInput = {
      organizationId: params.organizationId,
    };

    if (params.searchTerm) {
      where.OR = [
        { bookerEmail: { contains: params.searchTerm, mode: "insensitive" } },
        { description: { contains: params.searchTerm, mode: "insensitive" } },
        {
          reportedBy: {
            OR: [
              { name: { contains: params.searchTerm, mode: "insensitive" } },
              { email: { contains: params.searchTerm, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    if (params.filters) {
      if (params.filters.reason && params.filters.reason.length > 0) {
        where.reason = { in: params.filters.reason };
      }
      if (params.filters.cancelled !== undefined) {
        where.cancelled = params.filters.cancelled;
      }
      if (params.filters.hasWatchlist !== undefined) {
        where.watchlistId = params.filters.hasWatchlist ? { not: null } : null;
      }
      if (params.filters.dateRange) {
        where.createdAt = {};
        if (params.filters.dateRange.from) {
          where.createdAt.gte = params.filters.dateRange.from;
        }
        if (params.filters.dateRange.to) {
          where.createdAt.lte = params.filters.dateRange.to;
        }
      }
    }

    const [totalCount, reports] = await Promise.all([
      this.prismaClient.bookingReport.count({ where }),
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
          watchlistId: true,
          reportedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          booking: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              title: true,
              uid: true,
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
        orderBy: [{ watchlistId: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
      }),
    ]);

    return {
      rows: reports.map((report) => ({
        ...report,
        reporter: report.reportedBy,
      })),
      meta: { totalRowCount: totalCount },
    };
  }

  async linkWatchlistToReport(params: { reportId: string; watchlistId: string }): Promise<void> {
    await this.prismaClient.bookingReport.update({
      where: { id: params.reportId },
      data: { watchlistId: params.watchlistId },
    });
  }

  async findReportsByIds(params: {
    reportIds: string[];
    organizationId: number;
  }): Promise<BookingReportWithDetails[]> {
    const reports = await this.prismaClient.bookingReport.findMany({
      where: {
        id: { in: params.reportIds },
        organizationId: params.organizationId,
      },
      select: {
        id: true,
        bookingUid: true,
        bookerEmail: true,
        reportedById: true,
        reason: true,
        description: true,
        cancelled: true,
        createdAt: true,
        watchlistId: true,
        reportedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        booking: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            title: true,
            uid: true,
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

  async deleteReport(params: { reportId: string; organizationId: number }): Promise<void> {
    await this.prismaClient.bookingReport.delete({
      where: {
        id: params.reportId,
        organizationId: params.organizationId,
      },
    });
  }
}
