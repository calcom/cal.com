import type { PrismaClient } from "@calcom/prisma/client";
import type { RegisterAppPushSubscriptionInput } from "./app-push-subscription-schema";

export class AppPushSubscriptionRepository {
  constructor(private prisma: PrismaClient) {}

  async upsert(userId: number, input: RegisterAppPushSubscriptionInput) {
    const subscriptionPayload = JSON.stringify({
      token: input.token,
      platform: input.platform,
      deviceId: input.deviceId,
    });

    return this.prisma.notificationsSubscriptions.upsert({
      where: {
        userId_type_identifier: {
          userId,
          type: "APP_PUSH",
          identifier: input.token,
        },
      },
      create: {
        userId,
        type: "APP_PUSH",
        platform: input.platform,
        identifier: input.token,
        deviceId: input.deviceId,
        subscription: subscriptionPayload,
      },
      update: {
        platform: input.platform,
        deviceId: input.deviceId,
        subscription: subscriptionPayload,
        lastSeenAt: new Date(),
      },
      select: {
        id: true,
        userId: true,
        type: true,
        platform: true,
        identifier: true,
        deviceId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async removeByToken(userId: number, token: string) {
    return this.prisma.notificationsSubscriptions.deleteMany({
      where: {
        userId,
        type: "APP_PUSH",
        identifier: token,
      },
    });
  }
}
