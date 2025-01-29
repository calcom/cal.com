import type { Logger } from "tslog";

import { getUTCOffsetByTimezone } from "@calcom/lib/date-fns";
import { HttpError } from "@calcom/lib/http-error";
import isOutOfBounds, { BookingDateInPastError } from "@calcom/lib/isOutOfBounds";
import type { EventType } from "@calcom/prisma/client";

type ValidateBookingTimeEventType = Pick<
  EventType,
  | "periodType"
  | "periodDays"
  | "periodEndDate"
  | "periodStartDate"
  | "periodCountCalendarDays"
  | "minimumBookingNotice"
  | "eventName"
  | "id"
  | "title"
>;

export const validateBookingTimeIsNotOutOfBounds = async <T extends ValidateBookingTimeEventType>(
  reqBodyStartTime: string,
  reqBodyTimeZone: string,
  eventType: T,
  eventTimeZone: string | null | undefined,
  logger: Logger<unknown>
) => {
  let timeOutOfBounds = false;
  let cause: string | null = null;

  try {
    const result = isOutOfBounds(
      reqBodyStartTime,
      {
        periodType: eventType.periodType,
        periodDays: eventType.periodDays,
        periodEndDate: eventType.periodEndDate,
        periodStartDate: eventType.periodStartDate,
        periodCountCalendarDays: eventType.periodCountCalendarDays,
        bookerUtcOffset: getUTCOffsetByTimezone(reqBodyTimeZone) ?? 0,
        eventUtcOffset: eventTimeZone ? getUTCOffsetByTimezone(eventTimeZone) ?? 0 : 0,
      },
      eventType.minimumBookingNotice
    );

    timeOutOfBounds = result.isOutOfBounds;
    cause = result.cause;
  } catch (error) {
    logger.warn({
      message: "NewBooking: Unable to determine timeOutOfBounds status. Defaulting to false.",
    });

    if (error instanceof BookingDateInPastError) {
      logger.info(`Booking eventType ${eventType.id} failed`, JSON.stringify({ error }));
      throw new HttpError({ statusCode: 400, message: error.message });
    }
  }

  if (timeOutOfBounds) {
    const error = {
      errorCode: "BookingTimeOutOfBounds",
      message: `EventType '${eventType.title}' cannot be booked at this time. Reason: ${cause}`,
    };

    logger.warn({
      message: `NewBooking: EventType '${eventType.title}' cannot be booked at this time. Reason: ${cause}`,
    });

    throw new HttpError({ statusCode: 400, message: error.message });
  }
};
