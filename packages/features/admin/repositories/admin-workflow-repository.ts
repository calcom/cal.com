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

  async setWhitelisted(userId: number, whitelistWorkflows: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      select: {
        id: true,
        whitelistWorkflows: true,
      },
      data: { whitelistWorkflows },
    });
  }
}
