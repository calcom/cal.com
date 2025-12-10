import type { SupportedChannelsMap } from "./registry";

export enum NotificationChannel {
  EMAIL = "EMAIL",
  SMS = "SMS",
}

export enum NotificationType {
  BOOKING_CREATED = "BOOKING_CREATED",
  BOOKING_CONFIRMED = "BOOKING_CONFIRMED",
  BOOKING_CANCELLED = "BOOKING_CANCELLED",
  BOOKING_RESCHEDULED = "BOOKING_RESCHEDULED",
  BOOKING_REMINDER = "BOOKING_REMINDER",
  WORKFLOW_EMAIL_REMINDER = "WORKFLOW_EMAIL_REMINDER",
  WORKFLOW_SMS_REMINDER = "WORKFLOW_SMS_REMINDER",
}

export type NotificationContext = {
  userId: number;
  teamId?: number | null;
} & {
  [K in NotificationType]: {
    notificationType: K;
    channel: SupportedChannelsMap[K];
  };
}[NotificationType];

export interface NotificationPreference {
  emailEnabled: boolean;
  smsEnabled: boolean;
}

export interface TeamNotificationPreference extends NotificationPreference {
  locked: boolean;
}
