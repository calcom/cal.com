import type { BookingItemProps } from "../types";

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
