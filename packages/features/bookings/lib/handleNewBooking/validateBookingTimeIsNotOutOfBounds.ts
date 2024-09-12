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
  | "users"
  | "id"
>;

export const validateBookingTimeIsNotOutOfBounds = async <T extends ValidateBookingTimeEventType>(
  reqBodyStartTime: string,
  reqBodyTimeZone: string,
  eventType: T,
  logger: Logger<unknown>
) => {
  const user = eventType.users.find((user) => user.id === eventType.userId);
  const userSchedule = user?.schedules.find((schedule) => schedule.id === user?.defaultScheduleId);
  const eventTimeZone = eventType.schedule?.timeZone ?? userSchedule?.timeZone;

  let timeOutOfBounds = false;
  try {
    timeOutOfBounds = isOutOfBounds(
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
  } catch (error) {
    logger.warn({
      message: "NewBooking: Unable set timeOutOfBounds. Using false. ",
    });
    if (error instanceof BookingDateInPastError) {
      logger.info(`Booking eventType ${eventType.id} failed`, JSON.stringify({ error }));
      throw new HttpError({ statusCode: 400, message: error.message });
    }
  }

  if (timeOutOfBounds) {
    const error = {
      errorCode: "BookingTimeOutOfBounds",
      message: `EventType '${eventType.eventName}' cannot be booked at this time.`,
    };
    logger.warn({
      message: `NewBooking: EventType '${eventType.eventName}' cannot be booked at this time.`,
    });
    throw new HttpError({ statusCode: 400, message: error.message });
  }
};
