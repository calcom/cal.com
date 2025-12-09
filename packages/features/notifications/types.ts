export enum NotificationChannel {
  EMAIL = "EMAIL",
  SMS = "SMS",
}

export interface NotificationContext {
  userId: number;
  teamId?: number | null;
  notificationType: string;
  channel: NotificationChannel;
}

export interface NotificationPreference {
  emailEnabled: boolean;
  smsEnabled: boolean;
}

export interface TeamNotificationPreference extends NotificationPreference {
  locked: boolean;
}
