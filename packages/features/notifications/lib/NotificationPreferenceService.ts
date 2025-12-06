import { NotificationPreferenceRepository } from "../repositories/NotificationPreferenceRepository";

export interface NotificationPreferenceCheck {
  userId: number;
  teamId: number | null;
  notificationType: string;
  channel: "EMAIL" | "SMS";
}

type PreferenceWithChannels = {
  emailEnabled: boolean;
  smsEnabled: boolean;
};

const CHANNEL_TO_PROPERTY_MAP: Record<string, keyof PreferenceWithChannels> = {
  EMAIL: "emailEnabled",
  SMS: "smsEnabled",
} as const;

export class NotificationPreferenceService {
  constructor(private readonly repository: NotificationPreferenceRepository) {}

  private getChannelEnabled(preference: PreferenceWithChannels, channel: string): boolean {
    const propertyName = CHANNEL_TO_PROPERTY_MAP[channel];
    if (!propertyName) {
      return true;
    }
    return preference[propertyName] ?? true;
  }

  async shouldSendNotification(check: NotificationPreferenceCheck): Promise<boolean> {
    const { userId, teamId, notificationType, channel } = check;

    if (teamId) {
      const teamPref = await this.repository.findTeamPreference({ teamId, notificationType });

      if (teamPref?.locked) {
        return this.getChannelEnabled(teamPref, channel);
      }

      if (teamPref) {
        const userPref = await this.repository.findUserPreference({ userId, notificationType });

        if (userPref) {
          return this.getChannelEnabled(userPref, channel);
        }

        return this.getChannelEnabled(teamPref, channel);
      }
    }

    const userPref = await this.repository.findUserPreference({ userId, notificationType });

    if (userPref) {
      return this.getChannelEnabled(userPref, channel);
    }

    return true;
  }
}
