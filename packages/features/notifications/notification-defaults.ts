import type { NotificationEvent } from "@calcom/prisma/enums";

/**
 * Per-channel defaults for a single notification event.
 */
export type NotificationEventDefaults = {
  appPushEnabled: boolean;
  webPushEnabled: boolean;
  slackEnabled: boolean;
  telegramEnabled: boolean;
};

/**
 * Default enablement map for all booking notification events.
 * This is the single source of truth when no override row exists
 * in UserNotificationPreferences. All channels default to enabled
 * (opt-out model, not opt-in).
 */
export const NOTIFICATION_EVENT_DEFAULTS: Record<NotificationEvent, NotificationEventDefaults> = {
  BOOKING_CONFIRMED: {
    appPushEnabled: true,
    webPushEnabled: true,
    slackEnabled: true,
    telegramEnabled: true,
  },
  BOOKING_CANCELLED: {
    appPushEnabled: true,
    webPushEnabled: true,
    slackEnabled: true,
    telegramEnabled: true,
  },
  BOOKING_RESCHEDULED: {
    appPushEnabled: true,
    webPushEnabled: true,
    slackEnabled: true,
    telegramEnabled: true,
  },
  BOOKING_REQUESTED: {
    appPushEnabled: true,
    webPushEnabled: true,
    slackEnabled: true,
    telegramEnabled: true,
  },
  BOOKING_REJECTED: { appPushEnabled: true, webPushEnabled: true, slackEnabled: true, telegramEnabled: true },
};

/**
 * Global default: notifications are enabled unless explicitly disabled.
 */
export const DEFAULT_NOTIFICATIONS_ENABLED = true;
