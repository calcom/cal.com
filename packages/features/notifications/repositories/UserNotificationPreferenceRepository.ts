import type { PrismaClient } from "@calcom/prisma";

import type { NotificationPreference } from "../types";

type Dependencies = {
  prismaClient: PrismaClient;
};

export class UserNotificationPreferenceRepository {
  constructor(private readonly deps: Dependencies) {}

  async getPreference(userId: number, notificationType: string): Promise<NotificationPreference | null> {
    const preference = await this.deps.prismaClient.userNotificationPreference.findUnique({
      where: {
        userId_notificationType: {
          userId,
          notificationType,
        },
      },
      select: {
        emailEnabled: true,
        smsEnabled: true,
      },
    });

    return preference;
  }

  async getAllPreferences(userId: number): Promise<NotificationPreference[]> {
    const preferences = await this.deps.prismaClient.userNotificationPreference.findMany({
      where: {
        userId,
      },
      select: {
        emailEnabled: true,
        smsEnabled: true,
        notificationType: true,
      },
    });

    return preferences;
  }
}
