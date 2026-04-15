import type { BookingItemProps } from "../types";

/**
 * Whether the current viewer should be treated as a host for booking UI (e.g. cancel when
 * `disableCancelling` is on). Matches server-side host checks in `handleCancelBooking`, including
 * org admin of the booking organizer — that relationship is computed in `viewer.bookings.get` and
 * exposed as `isLoggedInUserOrgAdminOfBookingHost` so the client stays synchronous.
 */
export function isUserHostOfBooking(booking: BookingItemProps): boolean {
  const loggedInUserId = booking.loggedInUser.userId;

  if (!loggedInUserId) {
    return false;
  }

  if (booking.isLoggedInUserOrgAdminOfBookingHost) {
    return true;
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
