import type { BookingItemProps } from "@components/booking/types";

/**
 * Determines if the logged-in user is a host for the booking.
 * A user is considered a host if:
 * 1. They are the booking owner (booking.user.id === loggedInUserId), OR
 * 2. They are in the event type's hosts list AND their email appears in the attendees list
 *
 * @param booking - The booking item
 * @returns true if the logged-in user is a host, false otherwise
 */
export function isUserHost(booking: BookingItemProps): boolean {
  const loggedInUserId = booking.loggedInUser.userId;

  // Check if user is the booking owner
  if (booking.user?.id === loggedInUserId) {
    return true;
  }

  // Check if user is in the event type's hosts list
  // AND their email appears in the attendees list
  const isEventTypeHost = booking.eventType?.hosts?.some(({ user: hostUser }) => {
    if (hostUser?.id !== loggedInUserId) return false;
    if (!hostUser?.email) return false;
    return booking.attendees.some((attendee) => attendee.email === hostUser.email);
  });

  return !!isEventTypeHost;
}
