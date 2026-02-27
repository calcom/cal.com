import type { PrismaClient } from "@calcom/prisma";

/**
 * Test-only repository for User operations not available in production UserRepository.
 * Used in integration tests for setting organizationId and cleanup.
 */
export class TestUserRepository {
  constructor(private prismaClient: PrismaClient) {}

  async updateOrganizationId(userId: number, organizationId: number | null) {
    return this.prismaClient.user.update({
      where: { id: userId },
      data: { organizationId },
    });
  }

  async deleteMany(ids: number[]) {
    if (ids.length === 0) return;
    for (const userId of ids) {
      await this.prismaClient.availability.deleteMany({
        where: { Schedule: { userId } },
      });
      await this.prismaClient.schedule.deleteMany({ where: { userId } });
      await this.prismaClient.user.delete({ where: { id: userId } });
    }
  }
}
