import type { PrismaClient } from "@calcom/prisma/client";

export class PlatformBillingRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async findByTeamId(teamId: number) {
    return this.prismaClient.platformBilling.findUnique({
      where: {
        id: teamId,
      },
      select: {
        subscriptionId: true,
      },
    });
  }

  /**
   * Finds the billing plan for a team
   * @param teamId - The team ID
   * @returns The plan or null if not found
   */
  async findPlanByTeamId(teamId: number) {
    return this.prismaClient.platformBilling.findUnique({
      where: {
        id: teamId,
      },
      select: {
        plan: true,
      },
    });
  }
}
