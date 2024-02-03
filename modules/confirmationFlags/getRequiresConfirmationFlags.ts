import dayjs from "@calcom/dayjs";
import { getEventTypesFromDB } from "../eventTypes/getEventTypesFromDB";

export function getRequiresConfirmationFlags({
    eventType,
    bookingStartTime,
    userId,
    paymentAppData,
    originalRescheduledBookingOrganizerId,
  }: {
    eventType: Pick<Awaited<ReturnType<typeof getEventTypesFromDB>>, "metadata" | "requiresConfirmation">;
    bookingStartTime: string;
    userId: number | undefined;
    paymentAppData: { price: number };
    originalRescheduledBookingOrganizerId: number | undefined;
  }) {
    let requiresConfirmation = eventType?.requiresConfirmation;
    const rcThreshold = eventType?.metadata?.requiresConfirmationThreshold;
    if (rcThreshold) {
      if (dayjs(dayjs(bookingStartTime).utc().format()).diff(dayjs(), rcThreshold.unit) > rcThreshold.time) {
        requiresConfirmation = false;
      }
    }
  
    // If the user is not the owner of the event, new booking should be always pending.
    // Otherwise, an owner rescheduling should be always accepted.
    // Before comparing make sure that userId is set, otherwise undefined === undefined
    const userReschedulingIsOwner = !!(userId && originalRescheduledBookingOrganizerId === userId);
    const isConfirmedByDefault = (!requiresConfirmation && !paymentAppData.price) || userReschedulingIsOwner;
    return {
      /**
       * Organizer of the booking is rescheduling
       */
      userReschedulingIsOwner,
      /**
       * Booking won't need confirmation to be ACCEPTED
       */
      isConfirmedByDefault,
    };
  }