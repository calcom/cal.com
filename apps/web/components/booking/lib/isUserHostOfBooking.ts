import type { BookingItemProps } from "../types";

/**
 * Determines if the logged-in user is a host for the booking.
 * A user is considered a host if they are:
 * - The booking owner (booking.user.id)
 * - An event type host assigned to this booking (in eventType.hosts AND booking attendees)
 * - The event type owner (eventType.owner.id)
 *
 * This function includes attendee-email verification to ensure event type hosts
 * are actually assigned to the specific booking before granting host permissions.
 */
export function isUserHostOfBooking(booking: BookingItemProps): boolean {
  const loggedInUserId = booking.loggedInUser.userId;

  if (!loggedInUserId) {
    return false;
  }

  if (booking.user?.id != null && booking.user.id === loggedInUserId) {
    return true;
  }

  const userHost = booking.eventType?.hosts?.find((host) => host.userId === loggedInUserId);
  if (userHost?.user?.email) {
    const isAssignedToBooking = booking.attendees?.some(
      (attendee) => attendee.email === userHost.user?.email
    );
    if (isAssignedToBooking) {
      return true;
    }
  }

  if (booking.eventType?.owner?.id != null && booking.eventType.owner.id === loggedInUserId) {
    return true;
  }

  return false;
}
