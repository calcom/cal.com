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
}
