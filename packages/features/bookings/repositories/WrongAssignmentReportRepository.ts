import type { PrismaClient } from "@calcom/prisma";

export class WrongAssignmentReportRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async createReport(input: {
    bookingUid: string;
    reportedById: number;
    correctAssignee: string | null;
    additionalNotes: string;
    teamId: number | null;
  }): Promise<{ id: string }> {
    return this.prismaClient.wrongAssignmentReport.create({
      data: input,
      select: { id: true },
    });
  }
}
