import type { PrismaClient } from "@calcom/prisma";
import type { WrongAssignmentReportStatus } from "@calcom/prisma/enums";

export class WrongAssignmentReportRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async existsByBookingUid(bookingUid: string): Promise<boolean> {
    const report = await this.prismaClient.wrongAssignmentReport.findUnique({
      where: { bookingUid },
      select: { id: true },
    });
    return !!report;
  }

  async createReport(input: {
    bookingUid: string;
    reportedById: number;
    correctAssignee: string | null;
    additionalNotes: string;
    teamId: number | null;
    routingFormId: string | null;
  }): Promise<{ id: string }> {
    return this.prismaClient.wrongAssignmentReport.create({
      data: input,
      select: { id: true },
    });
  }

  async findTeamIdById(id: string): Promise<{ id: string; teamId: number | null } | null> {
    return this.prismaClient.wrongAssignmentReport.findUnique({
      where: { id },
      select: {
        id: true,
        teamId: true,
      },
    });
  }

  async findByTeamIdsAndStatuses({
    teamIds,
    statuses,
    routingFormId,
    reportedById,
    limit,
    offset,
  }: {
    teamIds: number[];
    statuses: WrongAssignmentReportStatus[];
    routingFormId?: string;
    reportedById?: number;
    limit: number;
    offset: number;
  }) {
    const where: {
      teamId: { in: number[] };
      status: { in: WrongAssignmentReportStatus[] };
      routingFormId?: string;
      reportedById?: number;
    } = { teamId: { in: teamIds }, status: { in: statuses } };
    if (routingFormId) where.routingFormId = routingFormId;
    if (reportedById) where.reportedById = reportedById;
    const [reports, totalCount] = await Promise.all([
      this.prismaClient.wrongAssignmentReport.findMany({
        where,
        select: {
          id: true,
          bookingUid: true,
          correctAssignee: true,
          additionalNotes: true,
          status: true,
          createdAt: true,
          reviewedAt: true,
          booking: {
            select: {
              id: true,
              title: true,
              startTime: true,
              endTime: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              attendees: {
                select: {
                  name: true,
                  email: true,
                },
              },
              routedFromRoutingFormReponse: {
                select: {
                  id: true,
                },
              },
            },
          },
          reportedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          routingForm: {
            select: {
              id: true,
              name: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prismaClient.wrongAssignmentReport.count({ where }),
    ]);

    return { reports, totalCount };
  }

  async updateStatus({
    id,
    status,
    reviewedById,
  }: {
    id: string;
    status: WrongAssignmentReportStatus;
    reviewedById: number;
  }) {
    return this.prismaClient.wrongAssignmentReport.update({
      where: { id },
      data: {
        status,
        reviewedById: status === "PENDING" ? null : reviewedById,
        reviewedAt: status === "PENDING" ? null : new Date(),
      },
      select: {
        id: true,
        status: true,
        reviewedById: true,
        reviewedAt: true,
      },
    });
  }
}
