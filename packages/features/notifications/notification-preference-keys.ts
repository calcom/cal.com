import type { NotificationEvent } from "@calcom/prisma/enums";

/**
 * Centralized key definitions for the generic NotificationPreference table.
 *
 * All preference keys used in reads and writes must be defined here.
 * Keys are plain strings in the DB — type safety lives in this module.
 */

/** Global notifications enabled/disabled toggle. */
export const NOTIFICATIONS_ENABLED_KEY = "notifications.enabled";

/** Supported push-related notification channels. */
export const NOTIFICATION_CHANNELS = ["app_push", "web_push", "slack", "telegram"] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

/**
 * Build a per-event channel preference key.
 *
 * Example: buildChannelKey("BOOKING_CONFIRMED", "web_push")
 *       => "booking_confirmed.channel.web_push"
 */
export function buildChannelKey(event: NotificationEvent, channel: NotificationChannel): string {
  return `${event.toLowerCase()}.channel.${channel}`;
}

/**
 * Parse a channel key back into its event and channel parts.
 * Returns null if the key does not match the expected format.
 */
export function parseChannelKey(
  key: string
): { event: string; channel: NotificationChannel } | null {
  const match = key.match(/^(.+)\.channel\.(.+)$/);
  if (!match) return null;

  const [, eventPart, channelPart] = match;
  if (!NOTIFICATION_CHANNELS.includes(channelPart as NotificationChannel)) return null;

  return {
    event: eventPart!.toUpperCase(),
    channel: channelPart as NotificationChannel,
  };
}

/**
 * Build all channel keys for a given event.
 * Useful for checking if a scope has a complete set of preferences for an event.
 */
export function buildAllChannelKeys(event: NotificationEvent): string[] {
  return NOTIFICATION_CHANNELS.map((channel) => buildChannelKey(event, channel));
}
