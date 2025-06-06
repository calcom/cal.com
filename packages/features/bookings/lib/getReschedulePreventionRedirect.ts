import { BookingStatus } from "@calcom/prisma/client";

/***
 * There can be two types of redirects that prevent rescheduling:
 * 1. Redirect to the booking details page
 * 2. Redirect to the event page
 *
 * The first one is when the event type is disabled for rescheduling or the booking is already REJECTED or CANCELLED but the event type does not allow booking through reschedule link of cancelled booking.
 * The second one is when the booking is cancelled and the event type allows booking cancelled bookings.
 */
export const getReschedulePreventionRedirect = ({
  booking,
  allowRescheduleForCancelledBooking,
}: {
  // This comes from query param and thus is considered forced
  booking: {
    eventType: {
      disableRescheduling: boolean;
      allowReschedulingCancelledBookings: boolean;
      url: string;
    };
    uid: string;
    status: BookingStatus;
  };
  allowRescheduleForCancelledBooking: boolean;
}) => {
  const eventUrl = booking.eventType.url;
  const uid = booking.uid;
  const isForcedRescheduleForCancelledBooking = allowRescheduleForCancelledBooking;
  const isDisabledRescheduling = booking.eventType?.disableRescheduling;
  const canRescheduleCancelledBooking =
    isForcedRescheduleForCancelledBooking || booking.eventType?.allowReschedulingCancelledBookings;

  const bookingDetailsPageUrl = `/booking/${uid}`;
  if (isDisabledRescheduling) {
    return {
      redirect: {
        destination: bookingDetailsPageUrl,
        permanent: false,
      },
    };
  }

  // If booking is already REJECTED, we can't reschedule this booking. Take the user to the booking details page
  // If the booking is CANCELLED and is allowed to create a new booking through that link, we redirect the user to the original event link. Otherwise, we redirect to the booking details page.
  const isNonRescheduleableBooking =
    booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.REJECTED;

  if (isNonRescheduleableBooking) {
    const canBookThroughRescheduleLink =
      booking.status === BookingStatus.CANCELLED && canRescheduleCancelledBooking;
    return {
      redirect: {
        destination: canBookThroughRescheduleLink ? eventUrl : bookingDetailsPageUrl,
        permanent: false,
      },
    };
  }
};
