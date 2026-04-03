import type { NotificationEvent } from "@calcom/prisma/enums";

/**
 * Channel configuration for push-related notification preferences.
 * Email is managed separately via existing OrganizationSettings flags.
 */
export type NotificationChannelConfig = {
  appPushEnabled: boolean;
  webPushEnabled: boolean;
  slackEnabled: boolean;
  telegramEnabled: boolean;
};

/**
 * Notification settings at any scope (org or user).
 * Controls the global notification enabled/disabled state for that scope.
 */
export type NotificationSettingsRow = {
  enabled: boolean;
};

/**
 * Notification preferences at any scope (org or user).
 * Controls per-event, per-channel push notification configuration.
 */
export type NotificationPreferencesRow = NotificationChannelConfig & {
  event: NotificationEvent;
};

/**
 * The fully resolved effective notification settings after applying
 * the org -> user precedence chain.
 */
export type EffectiveNotificationSettings = {
  enabled: boolean;
  source: "default" | "organization" | "user";
};

/**
 * The fully resolved effective notification preferences for a single event
 * after applying the org -> user precedence chain.
 */
export type EffectiveNotificationPreferences = NotificationChannelConfig & {
  event: NotificationEvent;
  source: "default" | "organization" | "user";
};

/**
 * Context needed to resolve notification settings/preferences for a user
 * in the context of a specific booking/event.
 */
export type NotificationResolutionContext = {
  userId: number;
  /** The organization that the team belongs to (null if no org) */
  organizationId: number | null;
};

/**
 * Raw settings data fetched from both scopes before precedence resolution.
 */
export type RawNotificationSettings = {
  organizationSettings: NotificationSettingsRow | null;
  userSettings: NotificationSettingsRow | null;
};

/**
 * Raw preferences data fetched from both scopes before precedence resolution.
 */
export type RawNotificationPreferences = {
  organizationPreferences: NotificationPreferencesRow | null;
  userPreferences: NotificationPreferencesRow | null;
};

/**
 * Default channel configuration used when no scope has set preferences.
 * All channels default to enabled so notifications are opt-out, not opt-in.
 */
export const DEFAULT_CHANNEL_CONFIG: NotificationChannelConfig = {
  appPushEnabled: true,
  webPushEnabled: true,
  slackEnabled: true,
  telegramEnabled: true,
};
