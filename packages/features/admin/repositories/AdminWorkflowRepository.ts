import type { PrismaClient } from "@calcom/prisma";

export class AdminWorkflowRepository {
  constructor(private prisma: PrismaClient) {}

  async verifyUnverifiedSteps(userId: number) {
    return this.prisma.workflowStep.updateMany({
      where: {
        workflow: { userId },
        verifiedAt: null,
      },
      data: {
        verifiedAt: new Date(),
      },
    });
  }
}
