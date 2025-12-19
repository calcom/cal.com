import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";

import { BookingRepository } from "../../repositories/BookingRepository";

const log = logger.getSubLogger({ prefix: ["[checkActiveBookingsLimitForBooker]"] });

export const checkActiveBookingsLimitForBooker = async ({
  eventTypeId,
  maxActiveBookingsPerBooker,
  bookerEmail,
  offerToRescheduleLastBooking,
  bookingRepository,
}: {
  eventTypeId: number;
  maxActiveBookingsPerBooker: number | null;
  bookerEmail: string;
  offerToRescheduleLastBooking: boolean;
  bookingRepository: BookingRepository;
}) => {
  if (!maxActiveBookingsPerBooker) {
    return;
  }

  if (offerToRescheduleLastBooking) {
    await checkActiveBookingsLimitAndOfferReschedule({
      eventTypeId,
      maxActiveBookingsPerBooker,
      bookerEmail,
      bookingRepository,
    });
  } else {
    await checkActiveBookingsLimit({
      eventTypeId,
      maxActiveBookingsPerBooker,
      bookerEmail,
      bookingRepository,
    });
  }
};

/** If we don't need the last record then we should just use COUNT */
const checkActiveBookingsLimit = async ({
  eventTypeId,
  maxActiveBookingsPerBooker,
  bookerEmail,
  bookingRepository,
}: {
  eventTypeId: number;
  maxActiveBookingsPerBooker: number;
  bookerEmail: string;
  bookingRepository: BookingRepository;
}) => {
  const bookingsCount = await bookingRepository.countActiveBookingsForEventType({
    eventTypeId,
    bookerEmail,
  });

  if (bookingsCount >= maxActiveBookingsPerBooker) {
    log.warn(`Maximum booking limit reached for ${bookerEmail} for event type ${eventTypeId}`);
    throw new ErrorWithCode(ErrorCode.BookerLimitExceeded, ErrorCode.BookerLimitExceeded, {
      count: maxActiveBookingsPerBooker,
    });
  }
};

const checkActiveBookingsLimitAndOfferReschedule = async ({
  eventTypeId,
  maxActiveBookingsPerBooker,
  bookerEmail,
  bookingRepository,
}: {
  eventTypeId: number;
  maxActiveBookingsPerBooker: number;
  bookerEmail: string;
  bookingRepository: BookingRepository;
}) => {
  const bookingsCount = await bookingRepository.findActiveBookingsForEventType({
    eventTypeId,
    bookerEmail,
    limit: maxActiveBookingsPerBooker,
  });

  const lastBooking = bookingsCount[bookingsCount.length - 1];

  if (bookingsCount.length >= maxActiveBookingsPerBooker) {
    log.warn(`Maximum booking limit reached for ${bookerEmail} for event type ${eventTypeId}`);
    throw new ErrorWithCode(
      ErrorCode.BookerLimitExceededReschedule,
      ErrorCode.BookerLimitExceededReschedule,
      {
        rescheduleUid: lastBooking.uid,
        startTime: lastBooking.startTime,
        attendees: lastBooking.attendees,
      }
    );
  }
};
