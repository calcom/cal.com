import type { PrismaClient } from "@calcom/prisma";
import type { NotificationEvent } from "@calcom/prisma/enums";
import {
  NOTIFICATIONS_ENABLED_KEY,
  NOTIFICATION_CHANNELS,
  buildChannelKey,
} from "./notification-preference-keys";
import type { NotificationPreferencesRow, NotificationSettingsRow } from "./notification-scope-types";
import type {
  NotificationResolutionContext,
  RawNotificationPreferences,
  RawNotificationSettings,
} from "./notification-scope-types";

type GenericPrefRow = { key: string; booleanValue: boolean };

function mapToSettings(rows: GenericPrefRow[]): NotificationSettingsRow | null {
  const row = rows.find((r) => r.key === NOTIFICATIONS_ENABLED_KEY);
  if (!row) return null;
  return { enabled: row.booleanValue };
}

function mapToPreferences(rows: GenericPrefRow[], event: NotificationEvent): NotificationPreferencesRow | null {
  const channelMap = new Map<string, boolean>();
  for (const row of rows) {
    channelMap.set(row.key, row.booleanValue);
  }

  const appPushKey = buildChannelKey(event, "app_push");
  const webPushKey = buildChannelKey(event, "web_push");
  const slackKey = buildChannelKey(event, "slack");
  const telegramKey = buildChannelKey(event, "telegram");

  const hasAll =
    channelMap.has(appPushKey) &&
    channelMap.has(webPushKey) &&
    channelMap.has(slackKey) &&
    channelMap.has(telegramKey);

  if (!hasAll) return null;

  return {
    event,
    appPushEnabled: channelMap.get(appPushKey)!,
    webPushEnabled: channelMap.get(webPushKey)!,
    slackEnabled: channelMap.get(slackKey)!,
    telegramEnabled: channelMap.get(telegramKey)!,
  };
}

export class PrismaNotificationPreferencesRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Fetch raw notification settings from org and user scopes.
   * Reads from the generic NotificationPreference table filtered by targetType.
   */
  async getSettings(context: NotificationResolutionContext): Promise<RawNotificationSettings> {
    const [orgRows, userRows] = await Promise.all([
      context.organizationId !== null
        ? this.prisma.notificationPreference.findMany({
            where: {
              targetType: "ORGANIZATION",
              targetId: context.organizationId,
              key: NOTIFICATIONS_ENABLED_KEY,
            },
            select: { key: true, booleanValue: true },
          })
        : [],
      this.prisma.notificationPreference.findMany({
        where: {
          targetType: "USER",
          targetId: context.userId,
          key: NOTIFICATIONS_ENABLED_KEY,
        },
        select: { key: true, booleanValue: true },
      }),
    ]);

    return {
      organizationSettings: mapToSettings(orgRows),
      userSettings: mapToSettings(userRows),
    };
  }

  /**
   * Fetch raw notification preferences from org and user scopes for a specific event.
   * Reads per-event channel keys from the generic NotificationPreference table.
   */
  async getPreferences(
    context: NotificationResolutionContext,
    event: NotificationEvent
  ): Promise<RawNotificationPreferences> {
    const channelKeys = NOTIFICATION_CHANNELS.map((ch) => buildChannelKey(event, ch));

    const [orgRows, userRows] = await Promise.all([
      context.organizationId !== null
        ? this.prisma.notificationPreference.findMany({
            where: {
              targetType: "ORGANIZATION",
              targetId: context.organizationId,
              key: { in: channelKeys },
            },
            select: { key: true, booleanValue: true },
          })
        : [],
      this.prisma.notificationPreference.findMany({
        where: {
          targetType: "USER",
          targetId: context.userId,
          key: { in: channelKeys },
        },
        select: { key: true, booleanValue: true },
      }),
    ]);

    return {
      organizationPreferences: mapToPreferences(orgRows, event),
      userPreferences: mapToPreferences(userRows, event),
    };
  }
}
