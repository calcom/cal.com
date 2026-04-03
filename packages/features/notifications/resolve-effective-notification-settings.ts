import type { EffectiveNotificationSettings, NotificationSettingsRow } from "./notification-scope-types";

/**
 * Resolves effective notification settings using org -> user precedence.
 *
 * Organization provides defaults, user can override.
 * Row absence means inherit from the less-specific scope.
 *
 * Precedence order:
 * 1. Start with default (enabled: true)
 * 2. Organization row overrides default if present
 * 3. User row overrides organization if present
 */
export function resolveEffectiveNotificationSettings({
  organizationSettings,
  userSettings,
}: {
  organizationSettings: NotificationSettingsRow | null;
  userSettings: NotificationSettingsRow | null;
}): EffectiveNotificationSettings {
  let enabled = true;
  let source: EffectiveNotificationSettings["source"] = "default";

  if (organizationSettings !== null) {
    enabled = organizationSettings.enabled;
    source = "organization";
  }

  if (userSettings !== null) {
    enabled = userSettings.enabled;
    source = "user";
  }

  return { enabled, source };
}
