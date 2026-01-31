import type { PrismaClient } from "@calcom/prisma";

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
}
