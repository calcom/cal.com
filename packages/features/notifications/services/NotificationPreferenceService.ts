import type { TeamNotificationPreferenceRepository } from "../repositories/TeamNotificationPreferenceRepository";
import type { UserNotificationPreferenceRepository } from "../repositories/UserNotificationPreferenceRepository";
import { NotificationChannel } from "../types";
import type { NotificationContext } from "../types";

type Dependencies = {
  userNotificationPreferenceRepository: UserNotificationPreferenceRepository;
  teamNotificationPreferenceRepository: TeamNotificationPreferenceRepository;
};

export class NotificationPreferenceService {
  constructor(private readonly deps: Dependencies) {}

  async isNotificationEnabled(context: NotificationContext): Promise<boolean> {
    const { userId, teamId, notificationType, channel } = context;

    if (teamId) {
      const teamPreference = await this.deps.teamNotificationPreferenceRepository.getPreference(
        teamId,
        notificationType
      );

      if (teamPreference?.locked) {
        return this.isChannelEnabled(teamPreference, channel);
      }

      if (teamPreference) {
        return this.isChannelEnabled(teamPreference, channel);
      }
    }

    const userPreference = await this.deps.userNotificationPreferenceRepository.getPreference(
      userId,
      notificationType
    );

    if (userPreference) {
      return this.isChannelEnabled(userPreference, channel);
    }

    return true;
  }

  private isChannelEnabled(
    preference: { emailEnabled: boolean; smsEnabled: boolean },
    channel: NotificationChannel
  ): boolean {
    if (channel === NotificationChannel.EMAIL) {
      return preference.emailEnabled;
    }
    if (channel === NotificationChannel.SMS) {
      return preference.smsEnabled;
    }
    return true;
  }
}
