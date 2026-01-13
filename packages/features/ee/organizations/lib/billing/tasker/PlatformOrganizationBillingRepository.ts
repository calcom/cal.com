import type { PrismaClient } from "@calcom/prisma/client";

export class PlatformOrganizationBillingRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async findPlatformOrgFromUserId(userId: number) {
    return this.prismaClient.team.findFirstOrThrow({
      where: {
        orgProfiles: {
          some: {
            userId: userId,
          },
        },
        isPlatform: true,
        isOrganization: true,
      },
      select: {
        id: true,
        isPlatform: true,
        isOrganization: true,
      },
    });
  }

  async findBillingByTeamId(teamId: number) {
    return this.prismaClient.platformBilling.findUnique({
      where: {
        id: teamId,
      },
    });
  }
}
