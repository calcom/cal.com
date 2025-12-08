import type { PrismaClient } from "@calcom/prisma";
import type { UserNotificationPreference, TeamNotificationPreference } from "@calcom/prisma/client";

export class NotificationPreferenceRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async findUserPreference({
    userId,
    notificationType,
  }: {
    userId: number;
    notificationType: string;
  }): Promise<UserNotificationPreference | null> {
    return this.prismaClient.userNotificationPreference.findUnique({
      where: {
        userId_notificationType: { userId, notificationType },
      },
    });
  }

  async findTeamPreference({
    teamId,
    notificationType,
  }: {
    teamId: number;
    notificationType: string;
  }): Promise<TeamNotificationPreference | null> {
    return this.prismaClient.teamNotificationPreference.findUnique({
      where: {
        teamId_notificationType: { teamId, notificationType },
      },
    });
  }

  async findUserPreferences({ userId }: { userId: number }): Promise<UserNotificationPreference[]> {
    return this.prismaClient.userNotificationPreference.findMany({
      where: { userId },
    });
  }

  async findTeamPreferences({ teamId }: { teamId: number }): Promise<TeamNotificationPreference[]> {
    return this.prismaClient.teamNotificationPreference.findMany({
      where: { teamId },
    });
  }

  async upsertUserPreference({
    userId,
    notificationType,
    emailEnabled,
    smsEnabled,
  }: {
    userId: number;
    notificationType: string;
    emailEnabled: boolean;
    smsEnabled: boolean;
  }): Promise<UserNotificationPreference> {
    return this.prismaClient.userNotificationPreference.upsert({
      where: {
        userId_notificationType: { userId, notificationType },
      },
      create: {
        userId,
        notificationType,
        emailEnabled,
        smsEnabled,
      },
      update: {
        emailEnabled,
        smsEnabled,
      },
    });
  }

  async upsertTeamPreference({
    teamId,
    notificationType,
    emailEnabled,
    smsEnabled,
    locked,
  }: {
    teamId: number;
    notificationType: string;
    emailEnabled: boolean;
    smsEnabled: boolean;
    locked: boolean;
  }): Promise<TeamNotificationPreference> {
    return this.prismaClient.teamNotificationPreference.upsert({
      where: {
        teamId_notificationType: { teamId, notificationType },
      },
      create: {
        teamId,
        notificationType,
        emailEnabled,
        smsEnabled,
        locked,
      },
      update: {
        emailEnabled,
        smsEnabled,
        locked,
      },
    });
  }

  async deleteUserPreference({
    userId,
    notificationType,
  }: {
    userId: number;
    notificationType: string;
  }): Promise<void> {
    await this.prismaClient.userNotificationPreference.delete({
      where: {
        userId_notificationType: { userId, notificationType },
      },
    });
  }

  async deleteTeamPreference({
    teamId,
    notificationType,
  }: {
    teamId: number;
    notificationType: string;
  }): Promise<void> {
    await this.prismaClient.teamNotificationPreference.delete({
      where: {
        teamId_notificationType: { teamId, notificationType },
      },
    });
  }

  async deleteAllUserPreferences({ userId }: { userId: number }): Promise<void> {
    await this.prismaClient.userNotificationPreference.deleteMany({
      where: { userId },
    });
  }

  async deleteAllTeamPreferences({ teamId }: { teamId: number }): Promise<void> {
    await this.prismaClient.teamNotificationPreference.deleteMany({
      where: { teamId },
    });
  }
}
