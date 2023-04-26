import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";
import { parseRecurringDates } from "@calcom/lib/parse-dates";

import type { PublicEvent, BookingCreateBody, RecurringBookingCreateBody } from "../../types";

type BookingOptions = {
  values: Record<string, unknown>;
  event: PublicEvent;
  date: string;
  // @NOTE: duration is not validated in this function
  duration: number | undefined | null;
  timeZone: string;
  language: string;
  rescheduleUid: string | undefined;
  username: string;
  metadata?: Record<string, string>;
};

export const mapBookingToMutationInput = ({
  values,
  event,
  date,
  duration,
  timeZone,
  language,
  rescheduleUid,
  username,
  metadata,
}: BookingOptions): BookingCreateBody => {
  return {
    ...values,
    user: username,
    start: dayjs(date).format(),
    end: dayjs(date)
      // Defaults to the default event length in case no custom duration is set.
      .add(duration || event.length, "minute")
      .format(),
    eventTypeId: event.id,
    eventTypeSlug: event.slug,
    timeZone: timeZone,
    language: language,
    rescheduleUid,
    metadata: metadata || {},
    hasHashedBookingLink: false,
    // hasHashedBookingLink,
    // hashedLink,
  };
};

// This method is here to ensure that the types are correct (recurring count is required),
// as well as generate a unique ID for the recurring bookings and turn one single booking
// into an array of mutiple bookings based on the recurring count.
// Other than that it forwards the mapping to mapBookingToMutationInput.
export const mapRecurringBookingToMutationInput = (
  booking: BookingOptions,
  recurringCount: number
): RecurringBookingCreateBody[] => {
  const recurringEventId = uuidv4();
  const [, recurringDates] = parseRecurringDates(
    {
      startDate: booking.date,
      timeZone: booking.timeZone,
      recurringEvent: booking.event.recurringEvent,
      recurringCount,
      withDefaultTimeFormat: true,
    },
    booking.language
  );

  const input = mapBookingToMutationInput(booking);

  return recurringDates.map((recurringDate) => ({
    ...input,
    start: dayjs(recurringDate).format(),
    end: dayjs(recurringDate)
      .add(booking.duration || booking.event.length, "minute")
      .format(),
    recurringEventId,
    recurringCount: recurringDates.length,
  }));
};
