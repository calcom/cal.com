import type { PrismaClient } from "@calcom/prisma";

/**
 * Test-only repository for User cleanup operations not available in production UserRepository.
 * Used in integration tests to delete users and their related records.
 */
export class TestUserRepository {
  constructor(private prismaClient: PrismaClient) {}

  async deleteMany(ids: number[]) {
    if (ids.length === 0) return;
    // Delete memberships first to avoid FK constraints when deleting users or teams
    await this.prismaClient.membership.deleteMany({ where: { userId: { in: ids } } });
    // Delete profiles created by UserRepository.create for org users
    await this.prismaClient.profile.deleteMany({ where: { userId: { in: ids } } });
    for (const userId of ids) {
      await this.prismaClient.availability.deleteMany({
        where: { Schedule: { userId } },
      });
      await this.prismaClient.schedule.deleteMany({ where: { userId } });
      await this.prismaClient.user.delete({ where: { id: userId } });
    }
  }
}
