/**
 * Cal.com user recipient resolution for booking push notifications.
 *
 * This module determines which real Cal.com users should receive a push
 * notification for a booking lifecycle event. Only users with Cal.com
 * accounts are eligible — external guests without accounts are excluded.
 *
 * This function does NOT check preferences or subscriptions. It only
 * determines who is eligible. Preference filtering and subscription
 * lookup happen downstream in the dispatcher.
 */

/**
 * Minimal booking shape needed for recipient resolution.
 * Callers provide this from whatever booking query they already have.
 */
export type BookingForNotificationRecipients = {
  userId: number | null;
  attendees: {
    email: string;
  }[];
  hosts: {
    userId: number;
  }[];
};

export type NotificationRecipientReason = "organizer" | "host" | "attendee";

export type NotificationRecipient = {
  userId: number;
  /**
   * Why this user is receiving the notification.
   * Deliberately first-seen wins: a user who is both organizer and host
   * appears once with reason "organizer". This is a v1 simplification —
   * if audit needs change, this can become reasons: NotificationRecipientReason[].
   */
  reason: NotificationRecipientReason;
};

/**
 * Resolves the set of real Cal.com user IDs who should receive a push
 * notification for a booking lifecycle event.
 *
 * Rules:
 * - Organizer: always (they are a real Cal user)
 * - Assigned hosts: always (they are real Cal users)
 * - Attendees: only if they map to a real Cal.com user account
 * - External guests without a Cal account: never
 *
 * @param booking - Minimal booking data (organizer, attendees, hosts)
 * @param attendeeUserIds - Map of lowercase email → Cal user ID for
 *   attendees that are real Cal users. Caller resolves this via a batch
 *   user lookup. Attendees not in this map are external guests.
 */
export function resolveNotificationRecipients(
  booking: BookingForNotificationRecipients,
  attendeeUserIds: Map<string, number>
): NotificationRecipient[] {
  const seen = new Set<number>();
  const recipients: NotificationRecipient[] = [];

  function add(userId: number, reason: NotificationRecipientReason): void {
    if (seen.has(userId)) {
      return;
    }
    seen.add(userId);
    recipients.push({ userId, reason });
  }

  if (booking.userId !== null) {
    add(booking.userId, "organizer");
  }

  for (const host of booking.hosts) {
    add(host.userId, "host");
  }

  for (const attendee of booking.attendees) {
    const normalizedEmail = attendee.email.toLowerCase();
    const calUserId = attendeeUserIds.get(normalizedEmail);
    if (calUserId !== undefined) {
      add(calUserId, "attendee");
    }
  }

  return recipients;
}
