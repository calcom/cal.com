import type { PrismaClient } from "@calcom/prisma";

import type { TeamNotificationPreference } from "../types";

type Dependencies = {
  prismaClient: PrismaClient;
};

export class TeamNotificationPreferenceRepository {
  constructor(private readonly deps: Dependencies) {}

  async getPreference(
    teamId: number,
    notificationType: string
  ): Promise<TeamNotificationPreference | null> {
    const preference = await this.deps.prismaClient.teamNotificationPreference.findUnique({
      where: {
        teamId_notificationType: {
          teamId,
          notificationType,
        },
      },
      select: {
        emailEnabled: true,
        smsEnabled: true,
        locked: true,
      },
    });

    return preference;
  }

  async getAllPreferences(teamId: number): Promise<TeamNotificationPreference[]> {
    const preferences = await this.deps.prismaClient.teamNotificationPreference.findMany({
      where: {
        teamId,
      },
      select: {
        emailEnabled: true,
        smsEnabled: true,
        locked: true,
        notificationType: true,
      },
    });

    return preferences;
  }
}
