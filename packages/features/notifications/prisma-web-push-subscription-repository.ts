import type { PrismaClient } from "@calcom/prisma/client";

export class PrismaWebPushSubscriptionRepository {
  constructor(private prisma: PrismaClient) {}

  async upsert(userId: number, endpoint: string, subscriptionJson: string) {
    return this.prisma.notificationsSubscriptions.upsert({
      where: {
        userId_type_identifier: {
          userId,
          type: "WEB_PUSH",
          identifier: endpoint,
        },
      },
      create: {
        userId,
        subscription: subscriptionJson,
        type: "WEB_PUSH",
        platform: "WEB",
        identifier: endpoint,
      },
      update: {
        subscription: subscriptionJson,
        lastSeenAt: new Date(),
      },
      select: {
        id: true,
        userId: true,
        type: true,
        platform: true,
        identifier: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async removeByEndpoint(userId: number, endpoint: string) {
    return this.prisma.notificationsSubscriptions.deleteMany({
      where: {
        userId,
        type: "WEB_PUSH",
        identifier: endpoint,
      },
    });
  }
}
