import type { PrismaClient } from "@calcom/prisma";
import type { BookingReportStatus, SystemReportStatus } from "@calcom/prisma/enums";
import type { Prisma } from "@calcom/prisma/generated/prisma/client";
import type {
  BookingReportWithDetails,
  CreateBookingReportInput,
  GroupedBookingReportWithDetails,
  IBookingReportRepository,
  ListBookingReportsFilters,
  SystemBookingReportsFilters,
} from "./IBookingReportRepository";

export class PrismaBookingReportRepository implements IBookingReportRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  private buildWhereClause(params: {
    organizationId?: number;
    searchTerm?: string;
    filters?: ListBookingReportsFilters;
    systemFilters?: SystemBookingReportsFilters;
  }): Prisma.BookingReportWhereInput {
    const where: Prisma.BookingReportWhereInput = {};

    if (params.organizationId) {
      where.organizationId = params.organizationId;
    }

    if (params.searchTerm) {
      where.OR = [
        { bookerEmail: { contains: params.searchTerm, mode: "insensitive" } },
        { reportedBy: { email: { contains: params.searchTerm, mode: "insensitive" } } },
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

    if (params.systemFilters?.systemStatus && params.systemFilters.systemStatus.length > 0) {
      where.systemStatus = { in: params.systemFilters.systemStatus };
    }

    return where;
  }

  private readonly reportSelect = {
    id: true,
    bookingUid: true,
    bookerEmail: true,
    reportedById: true,
    reason: true,
    description: true,
    cancelled: true,
    createdAt: true,
    status: true,
    systemStatus: true,
    watchlistId: true,
    globalWatchlistId: true,
    organizationId: true,
    reportedBy: { select: { id: true, email: true, name: true } },
    booking: { select: { id: true, uid: true, title: true, startTime: true, endTime: true } },
    watchlist: { select: { id: true, type: true, value: true, action: true, description: true } },
    globalWatchlist: { select: { id: true, type: true, value: true, action: true, description: true } },
    organization: { select: { id: true, name: true, slug: true } },
  } as const;

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
    systemFilters?: SystemBookingReportsFilters;
  }): Promise<{
    rows: BookingReportWithDetails[];
    meta: { totalRowCount: number };
  }> {
    const where = this.buildWhereClause(params);

    if (params.systemFilters?.systemStatus && params.systemFilters.systemStatus.length > 0) {
      where.systemStatus = { in: params.systemFilters.systemStatus };
    }

    const [reports, totalCount] = await Promise.all([
      this.prismaClient.bookingReport.findMany({
        where,
        skip: params.skip,
        take: params.take,
        select: this.reportSelect,
        orderBy: { createdAt: "desc" },
      }),
      this.prismaClient.bookingReport.count({ where }),
    ]);

    const rows = reports.map((report) => ({ ...report, reporter: report.reportedBy }));

    return { rows, meta: { totalRowCount: totalCount } };
  }

  async findGroupedReportedBookings(params: {
    organizationId?: number;
    skip?: number;
    take?: number;
    searchTerm?: string;
    filters?: ListBookingReportsFilters;
    systemFilters?: SystemBookingReportsFilters;
    sortBy?: "createdAt" | "reportCount";
  }): Promise<{
    rows: GroupedBookingReportWithDetails[];
    meta: { totalRowCount: number };
  }> {
    const where = this.buildWhereClause(params);

    const orderBy =
      params.sortBy === "reportCount"
        ? { _count: { bookerEmail: "desc" as const } }
        : { _max: { createdAt: "desc" as const } };

    const groupedEmails = await this.prismaClient.bookingReport.groupBy({
      by: ["bookerEmail"],
      where,
      _count: { bookerEmail: true },
      _max: { createdAt: true },
      orderBy,
    });

    const totalRowCount = groupedEmails.length;
    const paginatedEmails = groupedEmails.slice(params.skip ?? 0, (params.skip ?? 0) + (params.take ?? 25));
    const emailList = paginatedEmails.map((g) => g.bookerEmail);

    if (emailList.length === 0) {
      return { rows: [], meta: { totalRowCount } };
    }

    const reports = await this.prismaClient.bookingReport.findMany({
      where: { ...where, bookerEmail: { in: emailList } },
      select: this.reportSelect,
      orderBy: { createdAt: "asc" },
    });

    const reportsByEmail = new Map<string, BookingReportWithDetails[]>();
    for (const report of reports) {
      const mapped: BookingReportWithDetails = { ...report, reporter: report.reportedBy };
      const existing = reportsByEmail.get(report.bookerEmail) || [];
      existing.push(mapped);
      reportsByEmail.set(report.bookerEmail, existing);
    }

    const rows: GroupedBookingReportWithDetails[] = paginatedEmails.map((group) => {
      const emailReports = reportsByEmail.get(group.bookerEmail) || [];
      const firstReport = emailReports[0];
      return { ...firstReport, reportCount: group._count.bookerEmail, reports: emailReports };
    });

    return { rows, meta: { totalRowCount } };
  }

  async findReportsByIds(params: {
    reportIds: string[];
    organizationId?: number;
  }): Promise<BookingReportWithDetails[]> {
    const where: Prisma.BookingReportWhereInput = { id: { in: params.reportIds } };

    if (params.organizationId) {
      where.organizationId = params.organizationId;
    }

    const reports = await this.prismaClient.bookingReport.findMany({
      where,
      select: this.reportSelect,
    });

    return reports.map((report) => ({ ...report, reporter: report.reportedBy }));
  }

  async linkWatchlistToReport(params: { reportId: string; watchlistId: string }): Promise<void> {
    await this.prismaClient.bookingReport.update({
      where: { id: params.reportId },
      data: { watchlistId: params.watchlistId },
    });
  }

  async updateReportStatus(params: {
    reportId: string;
    status: BookingReportStatus;
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

  async bulkLinkWatchlistWithStatus(params: {
    links: Array<{ reportId: string; watchlistId: string }>;
    status: BookingReportStatus;
  }): Promise<void> {
    if (params.links.length === 0) return;

    const groupedByWatchlist = new Map<string, string[]>();
    for (const link of params.links) {
      const reportIds = groupedByWatchlist.get(link.watchlistId) || [];
      reportIds.push(link.reportId);
      groupedByWatchlist.set(link.watchlistId, reportIds);
    }

    await Promise.all(
      Array.from(groupedByWatchlist.entries()).map(([watchlistId, reportIds]) =>
        this.prismaClient.bookingReport.updateMany({
          where: { id: { in: reportIds } },
          data: { watchlistId, status: params.status },
        })
      )
    );
  }

  async bulkLinkGlobalWatchlistWithSystemStatus(params: {
    links: Array<{ reportId: string; globalWatchlistId: string }>;
    systemStatus: SystemReportStatus;
  }): Promise<void> {
    if (params.links.length === 0) return;

    const groupedByWatchlist = new Map<string, string[]>();
    for (const link of params.links) {
      const reportIds = groupedByWatchlist.get(link.globalWatchlistId) || [];
      reportIds.push(link.reportId);
      groupedByWatchlist.set(link.globalWatchlistId, reportIds);
    }

    await Promise.all(
      Array.from(groupedByWatchlist.entries()).map(([globalWatchlistId, reportIds]) =>
        this.prismaClient.bookingReport.updateMany({
          where: { id: { in: reportIds } },
          data: { globalWatchlistId, systemStatus: params.systemStatus },
        })
      )
    );
  }

  async countPendingReports(params: { organizationId: number }): Promise<number> {
    return this.prismaClient.bookingReport.count({
      where: {
        organizationId: params.organizationId,
        status: "PENDING",
        watchlistId: null,
      },
    });
  }

  async updateSystemReportStatus(params: {
    reportId: string;
    systemStatus: SystemReportStatus;
    globalWatchlistId?: string | null;
  }): Promise<void> {
    await this.prismaClient.bookingReport.update({
      where: { id: params.reportId },
      data: {
        systemStatus: params.systemStatus,
        ...(params.globalWatchlistId !== undefined && { globalWatchlistId: params.globalWatchlistId }),
      },
    });
  }

  async bulkUpdateSystemReportStatus(params: {
    reportIds: string[];
    systemStatus: SystemReportStatus;
    globalWatchlistId?: string | null;
  }): Promise<{ updated: number }> {
    const result = await this.prismaClient.bookingReport.updateMany({
      where: { id: { in: params.reportIds } },
      data: {
        systemStatus: params.systemStatus,
        ...(params.globalWatchlistId !== undefined && { globalWatchlistId: params.globalWatchlistId }),
      },
    });
    return { updated: result.count };
  }

  async countSystemPendingReports(): Promise<number> {
    return this.prismaClient.bookingReport.count({
      where: {
        systemStatus: "PENDING",
      },
    });
  }

  async dismissReportsByEmail(params: {
    email: string;
    status: BookingReportStatus;
    organizationId: number;
  }): Promise<{ count: number }> {
    const result = await this.prismaClient.bookingReport.updateMany({
      where: {
        bookerEmail: { equals: params.email, mode: "insensitive" },
        watchlistId: null,
        status: "PENDING",
        organizationId: params.organizationId,
      },
      data: { status: params.status },
    });
    return { count: result.count };
  }

  async dismissSystemReportsByEmail(params: {
    email: string;
    systemStatus: SystemReportStatus;
  }): Promise<{ count: number }> {
    const result = await this.prismaClient.bookingReport.updateMany({
      where: {
        bookerEmail: { equals: params.email, mode: "insensitive" },
        globalWatchlistId: null,
        systemStatus: "PENDING",
      },
      data: { systemStatus: params.systemStatus },
    });
    return { count: result.count };
  }

  async findPendingReportsByEmail(params: {
    email: string;
    organizationId: number;
  }): Promise<Array<{ id: string; bookerEmail: string; watchlistId: string | null }>> {
    return this.prismaClient.bookingReport.findMany({
      where: {
        bookerEmail: { equals: params.email, mode: "insensitive" },
        status: "PENDING",
        watchlistId: null,
        organizationId: params.organizationId,
      },
      select: { id: true, bookerEmail: true, watchlistId: true },
    });
  }

  async findPendingReportsByDomain(params: {
    domain: string;
    organizationId: number;
  }): Promise<Array<{ id: string; bookerEmail: string; watchlistId: string | null }>> {
    return this.prismaClient.bookingReport.findMany({
      where: {
        bookerEmail: { endsWith: `@${params.domain}`, mode: "insensitive" },
        status: "PENDING",
        watchlistId: null,
        organizationId: params.organizationId,
      },
      select: { id: true, bookerEmail: true, watchlistId: true },
    });
  }

  async findPendingSystemReportsByEmail(params: {
    email: string;
  }): Promise<Array<{ id: string; bookerEmail: string; globalWatchlistId: string | null }>> {
    return this.prismaClient.bookingReport.findMany({
      where: {
        bookerEmail: { equals: params.email, mode: "insensitive" },
        systemStatus: "PENDING",
        globalWatchlistId: null,
      },
      select: { id: true, bookerEmail: true, globalWatchlistId: true },
    });
  }

  async findPendingSystemReportsByDomain(params: {
    domain: string;
  }): Promise<Array<{ id: string; bookerEmail: string; globalWatchlistId: string | null }>> {
    return this.prismaClient.bookingReport.findMany({
      where: {
        bookerEmail: { endsWith: `@${params.domain}`, mode: "insensitive" },
        systemStatus: "PENDING",
        globalWatchlistId: null,
      },
      select: { id: true, bookerEmail: true, globalWatchlistId: true },
    });
  }
}
