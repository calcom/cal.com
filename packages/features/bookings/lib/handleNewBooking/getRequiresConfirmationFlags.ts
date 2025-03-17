import dayjs from "@calcom/dayjs";
import { checkIfFreeEmailDomain } from "@calcom/lib/freeEmailDomainCheck/checkIfFreeEmailDomain";

import type { getEventTypeResponse } from "./getEventTypesFromDB";

type EventType = Pick<
  getEventTypeResponse,
  "metadata" | "requiresConfirmation" | "requiresConfirmationForFreeEmail"
>;
type PaymentAppData = { price: number };

export async function getRequiresConfirmationFlags({
  eventType,
  bookingStartTime,
  userId,
  paymentAppData,
  originalRescheduledBookingOrganizerId,
  bookerEmail,
}: {
  eventType: EventType;
  bookingStartTime: string;
  userId: number | undefined;
  paymentAppData: PaymentAppData;
  originalRescheduledBookingOrganizerId: number | undefined;
  bookerEmail: string;
}) {
  const requiresConfirmation = await determineRequiresConfirmation(eventType, bookingStartTime, bookerEmail);
  const userReschedulingIsOwner = isUserReschedulingOwner(userId, originalRescheduledBookingOrganizerId);
  const isConfirmedByDefault = determineIsConfirmedByDefault(
    requiresConfirmation,
    paymentAppData.price,
    userReschedulingIsOwner
  );

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

async function determineRequiresConfirmation(
  eventType: EventType,
  bookingStartTime: string,
  bookerEmail: string
): Promise<boolean> {
  let requiresConfirmation = eventType?.requiresConfirmation;
  const rcThreshold = eventType?.metadata?.requiresConfirmationThreshold;
  const requiresConfirmationForFreeEmail = eventType?.requiresConfirmationForFreeEmail;

  if (requiresConfirmationForFreeEmail) {
    requiresConfirmation = await checkIfFreeEmailDomain(bookerEmail);
  }

  if (rcThreshold) {
    const timeDifference = dayjs(dayjs(bookingStartTime).utc().format()).diff(dayjs(), rcThreshold.unit);
    if (timeDifference > rcThreshold.time) {
      requiresConfirmation = false;
    }
  }

  return requiresConfirmation;
}

function isUserReschedulingOwner(
  userId: number | undefined,
  originalRescheduledBookingOrganizerId: number | undefined
): boolean {
  // If the user is not the owner of the event, new booking should be always pending.
  // Otherwise, an owner rescheduling should be always accepted.
  // Before comparing make sure that userId is set, otherwise undefined === undefined
  return !!(userId && originalRescheduledBookingOrganizerId === userId);
}

function determineIsConfirmedByDefault(
  requiresConfirmation: boolean,
  price: number,
  userReschedulingIsOwner: boolean
): boolean {
  return (!requiresConfirmation && price === 0) || userReschedulingIsOwner;
}
