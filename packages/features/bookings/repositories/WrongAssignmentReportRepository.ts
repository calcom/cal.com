import type { PrismaClient } from "@calcom/prisma";
import type { WrongAssignmentReportStatus } from "@calcom/prisma/enums";

export class WrongAssignmentReportRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async existsByBookingUid(bookingUid: string): Promise<boolean> {
    const report = await this.prismaClient.wrongAssignmentReport.findFirst({
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

  async findById(id: string) {
    return this.prismaClient.wrongAssignmentReport.findUnique({
      where: { id },
      select: {
        id: true,
        bookingUid: true,
        reportedById: true,
        correctAssignee: true,
        additionalNotes: true,
        teamId: true,
        routingFormId: true,
        status: true,
        reviewedById: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
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
    });
  }

  async findByTeamIdAndStatus({
    teamId,
    status,
    limit,
    offset,
  }: {
    teamId: number;
    status: WrongAssignmentReportStatus;
    limit: number;
    offset: number;
  }) {
    const [reports, totalCount] = await Promise.all([
      this.prismaClient.wrongAssignmentReport.findMany({
        where: { teamId, status },
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
      this.prismaClient.wrongAssignmentReport.count({
        where: { teamId, status },
      }),
    ]);

    return { reports, totalCount };
  }

  async findByTeamIdAndStatuses({
    teamId,
    statuses,
    limit,
    offset,
  }: {
    teamId: number;
    statuses: WrongAssignmentReportStatus[];
    limit: number;
    offset: number;
  }) {
    const [reports, totalCount] = await Promise.all([
      this.prismaClient.wrongAssignmentReport.findMany({
        where: { teamId, status: { in: statuses } },
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
      this.prismaClient.wrongAssignmentReport.count({
        where: { teamId, status: { in: statuses } },
      }),
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
        reviewedById,
        reviewedAt: new Date(),
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
