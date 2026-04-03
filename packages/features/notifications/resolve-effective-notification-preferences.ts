import type { NotificationEvent } from "@calcom/prisma/enums";
import type {
  EffectiveNotificationPreferences,
  NotificationChannelConfig,
  NotificationPreferencesRow,
} from "./notification-scope-types";
import { DEFAULT_CHANNEL_CONFIG } from "./notification-scope-types";

function extractChannels(row: NotificationPreferencesRow): NotificationChannelConfig {
  return {
    appPushEnabled: row.appPushEnabled,
    webPushEnabled: row.webPushEnabled,
    slackEnabled: row.slackEnabled,
    telegramEnabled: row.telegramEnabled,
  };
}

/**
 * Resolves effective notification preferences for a single event using
 * org -> user precedence with row-absence inheritance.
 *
 * Organization provides defaults, user can override.
 * Each scope row is a full override for that event. If a scope has no row
 * for the event, it inherits from the less-specific scope.
 *
 * Precedence order:
 * 1. Start with default channel config (all enabled)
 * 2. Organization row replaces default if present for this event
 * 3. User row replaces organization if present for this event
 */
export function resolveEffectiveNotificationPreferences({
  event,
  organizationPreferences,
  userPreferences,
}: {
  event: NotificationEvent;
  organizationPreferences: NotificationPreferencesRow | null;
  userPreferences: NotificationPreferencesRow | null;
}): EffectiveNotificationPreferences {
  let channels: NotificationChannelConfig = { ...DEFAULT_CHANNEL_CONFIG };
  let source: EffectiveNotificationPreferences["source"] = "default";

  if (organizationPreferences !== null) {
    channels = extractChannels(organizationPreferences);
    source = "organization";
  }

  if (userPreferences !== null) {
    channels = extractChannels(userPreferences);
    source = "user";
  }

  return {
    event,
    ...channels,
    source,
  };
}
