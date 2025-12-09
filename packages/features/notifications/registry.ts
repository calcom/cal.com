import type { NotificationContext } from "./types";
import { NotificationChannel, NotificationType } from "./types";

export interface NotificationTypeConfig {
  type: NotificationType;
  label: string;
  description?: string;
  supportedChannels: NotificationChannel[];
}

export const NOTIFICATION_REGISTRY = {
  [NotificationType.WORKFLOW_EMAIL_REMINDER]: {
    type: NotificationType.WORKFLOW_EMAIL_REMINDER,
    label: "Workflow Email Reminders",
    description: "Email reminders sent through workflows",
    supportedChannels: [NotificationChannel.EMAIL],
  },
  [NotificationType.WORKFLOW_SMS_REMINDER]: {
    type: NotificationType.WORKFLOW_SMS_REMINDER,
    label: "Workflow SMS Reminders",
    description: "SMS reminders sent through workflows",
    supportedChannels: [NotificationChannel.SMS],
  },
  [NotificationType.BOOKING_CONFIRMED]: {
    type: NotificationType.BOOKING_CONFIRMED,
    label: "Booking Confirmed",
    description: "Notifications when a booking is confirmed",
    supportedChannels: [NotificationChannel.EMAIL, NotificationChannel.SMS],
  },
  [NotificationType.BOOKING_CANCELLED]: {
    type: NotificationType.BOOKING_CANCELLED,
    label: "Booking Cancelled",
    description: "Notifications when a booking is cancelled",
    supportedChannels: [NotificationChannel.EMAIL, NotificationChannel.SMS],
  },
  [NotificationType.BOOKING_RESCHEDULED]: {
    type: NotificationType.BOOKING_RESCHEDULED,
    label: "Booking Rescheduled",
    description: "Notifications when a booking is rescheduled",
    supportedChannels: [NotificationChannel.EMAIL, NotificationChannel.SMS],
  },
  [NotificationType.BOOKING_REMINDER]: {
    type: NotificationType.BOOKING_REMINDER,
    label: "Booking Reminders",
    description: "Reminder notifications for upcoming bookings",
    supportedChannels: [NotificationChannel.EMAIL, NotificationChannel.SMS],
  },
} as const satisfies Record<NotificationType, NotificationTypeConfig>;

type ArrayToUnion<T extends readonly unknown[]> = T[number];

export type SupportedChannelsMap = {
  [K in NotificationType]: ArrayToUnion<(typeof NOTIFICATION_REGISTRY)[K]["supportedChannels"]>;
};

export function getNotificationTypeConfig(type: NotificationType): NotificationTypeConfig {
  return NOTIFICATION_REGISTRY[type];
}

export function getAllNotificationTypes(): NotificationTypeConfig[] {
  return Object.values(NOTIFICATION_REGISTRY);
}

export function getNotificationTypesByChannel(channel: NotificationChannel): NotificationTypeConfig[] {
  return getAllNotificationTypes().filter((config) => config.supportedChannels.includes(channel));
}

export function isChannelSupported(type: NotificationType, channel: NotificationChannel): boolean {
  const config = NOTIFICATION_REGISTRY[type];
  return config?.supportedChannels.includes(channel) ?? false;
}

export function createNotificationContext<T extends NotificationType>(
  userId: number,
  notificationType: T,
  channel: SupportedChannelsMap[T],
  teamId?: number | null
): NotificationContext {
  if (!isChannelSupported(notificationType, channel)) {
    throw new Error(
      `Channel ${channel} is not supported for notification type ${notificationType}. Supported channels: ${NOTIFICATION_REGISTRY[
        notificationType
      ].supportedChannels.join(", ")}`
    );
  }

  return {
    userId,
    teamId: teamId ?? null,
    notificationType,
    channel,
  };
}
