import type { PrismaClient } from "@calcom/prisma";

/**
 * Test-only repository for EventType cleanup.
 * Used in integration tests to delete personal event types that aren't managed by TeamRepository.deleteById.
 */
export class TestEventTypeRepository {
  constructor(private prismaClient: PrismaClient) {}

  async deleteManyByUserIds(userIds: number[]) {
    if (userIds.length === 0) return;
    await this.prismaClient.eventType.deleteMany({
      where: { userId: { in: userIds } },
    });
  }
}
