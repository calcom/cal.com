import type { Booking, EventType } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import { getBusyCalendarTimes } from "@calcom/lib/CalendarManager";
import { subtract } from "@calcom/lib/date-ranges";
import { subtractTime, addTime, startOf, endOf, min, max, toISOString, utc } from "@calcom/lib/dateFns";
import { stringToDate } from "@calcom/lib/dateFns";
import { intervalLimitKeyToUnit } from "@calcom/lib/intervalLimits/intervalLimit";
import type { IntervalLimit } from "@calcom/lib/intervalLimits/intervalLimitSchema";
import logger from "@calcom/lib/logger";
import { getPiiFreeBooking } from "@calcom/lib/piiFreeData";
import { withReporting } from "@calcom/lib/sentryWrapper";
import { performance } from "@calcom/lib/server/perfObserver";
import prisma from "@calcom/prisma";
import type { SelectedCalendar } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import type { EventBusyDetails } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import { getDefinedBufferTimes } from "../features/eventtypes/lib/getDefinedBufferTimes";
import { BookingRepository } from "./server/repository/booking";

const _getBusyTimes = async (params: {
  credentials: CredentialForCalendarService[];
  userId: number;
  userEmail: string;
  username: string;
  eventTypeId?: number;
  startTime: string;
  beforeEventBuffer?: number;
  afterEventBuffer?: number;
  endTime: string;
  selectedCalendars: SelectedCalendar[];
  seatedEvent?: boolean;
  rescheduleUid?: string | null;
  duration?: number | null;
  currentBookings?:
    | (Pick<Booking, "id" | "uid" | "userId" | "startTime" | "endTime" | "title"> & {
        eventType: Pick<
          EventType,
          "id" | "beforeEventBuffer" | "afterEventBuffer" | "seatsPerTimeSlot"
        > | null;
        _count?: {
          seatsReferences: number;
        };
      })[]
    | null;
  bypassBusyCalendarTimes: boolean;
  shouldServeCache?: boolean;
}) => {
  const {
    credentials,
    userId,
    userEmail,
    username,
    eventTypeId,
    startTime,
    endTime,
    beforeEventBuffer,
    afterEventBuffer,
    selectedCalendars,
    seatedEvent,
    rescheduleUid,
    duration,
    bypassBusyCalendarTimes = false,
    shouldServeCache,
  } = params;

  logger.silly(
    `Checking Busy time from Cal Bookings in range ${startTime} to ${endTime} for input ${JSON.stringify({
      userId,
      eventTypeId,
      status: BookingStatus.ACCEPTED,
    })}`
  );

  /**
   * A user is considered busy within a given time period if there
   * is a booking they own OR attend.
   *
   * Performs a query for all bookings where:
   *   - The given booking is owned by this user, or..
   *   - The current user has a different booking at this time he/she attends
   *
   * See further discussion within this GH issue:
   * https://github.com/calcom/cal.com/issues/6374
   *
   * NOTE: Changes here will likely require changes to some mocking
   *  logic within getSchedule.test.ts:addBookings
   */
  performance.mark("prismaBookingGetStart");

  const startTimeDate =
    rescheduleUid && duration ? subtractTime(new Date(startTime), duration, "minute") : new Date(startTime);
  const endTimeDate =
    rescheduleUid && duration ? addTime(new Date(endTime), duration, "minute") : new Date(endTime);

  // to also get bookings that are outside of start and end time, but the buffer falls within the start and end time
  const definedBufferTimes = getDefinedBufferTimes();
  const maxBuffer = definedBufferTimes[definedBufferTimes.length - 1];
  const startTimeAdjustedWithMaxBuffer = subtractTime(startTimeDate, maxBuffer, "minute");
  const endTimeAdjustedWithMaxBuffer = addTime(endTimeDate, maxBuffer, "minute");

  // INFO: Refactored to allow this method to take in a list of current bookings for the user.
  // Will keep support for retrieving a user's bookings if the caller does not already supply them.
  // This function is called from multiple places but we aren't refactoring all of them at this moment
  // to avoid potential side effects.
  let bookings = params.currentBookings;

  if (!bookings) {
    const bookingRepo = new BookingRepository(prisma);
    bookings = await bookingRepo.findAllExistingBookingsForEventTypeBetween({
      userIdAndEmailMap: new Map([[userId, userEmail]]),
      eventTypeId,
      startDate: startTimeAdjustedWithMaxBuffer,
      endDate: endTimeAdjustedWithMaxBuffer,
      seatedEvent,
    });
  }

  const bookingSeatCountMap: { [x: string]: number } = {};
  const busyTimes = bookings.reduce((aggregate: EventBusyDetails[], booking) => {
    const { id, startTime, endTime, eventType, title, ...rest } = booking;

    const minutesToBlockBeforeEvent = (eventType?.beforeEventBuffer || 0) + (afterEventBuffer || 0);
    const minutesToBlockAfterEvent = (eventType?.afterEventBuffer || 0) + (beforeEventBuffer || 0);

    if (rest._count?.seatsReferences) {
      const bookedAt = `${toISOString(utc(startTime))}<>${toISOString(utc(endTime))}`;
      bookingSeatCountMap[bookedAt] = bookingSeatCountMap[bookedAt] || 0;
      bookingSeatCountMap[bookedAt]++;
      // Seat references on the current event are non-blocking until the event is fully booked.
      if (
        // there are still seats available.
        bookingSeatCountMap[bookedAt] < (eventType?.seatsPerTimeSlot || 1) &&
        // and this is the seated event, other event types should be blocked.
        eventTypeId === eventType?.id
      ) {
        // then we ONLY add the before/after buffer times as busy times.
        if (minutesToBlockBeforeEvent) {
          aggregate.push({
            start: subtractTime(new Date(startTime), minutesToBlockBeforeEvent, "minute"),
            end: new Date(startTime), // The event starts after the buffer
          });
        }
        if (minutesToBlockAfterEvent) {
          aggregate.push({
            start: new Date(endTime), // The event ends before the buffer
            end: addTime(new Date(endTime), minutesToBlockAfterEvent, "minute"),
          });
        }
        return aggregate;
      }
      // if it does get blocked at this point; we remove the bookingSeatCountMap entry
      // doing this allows using the map later to remove the ranges from calendar busy times.
      delete bookingSeatCountMap[bookedAt];
    }
    // rescheduling the same booking to the same time should be possible. Why?
    if (rest.uid === rescheduleUid) {
      return aggregate;
    }
    aggregate.push({
      start: subtractTime(new Date(startTime), minutesToBlockBeforeEvent, "minute"),
      end: addTime(new Date(endTime), minutesToBlockAfterEvent, "minute"),
      title,
      source: `eventType-${eventType?.id}-booking-${id}`,
    });
    return aggregate;
  }, []);

  logger.debug(
    `Busy Time from Cal Bookings ${JSON.stringify({
      busyTimes,
      bookings: bookings?.map((booking) => getPiiFreeBooking(booking)),
      numCredentials: credentials?.length,
    })}`
  );
  performance.mark("prismaBookingGetEnd");
  performance.measure(`prisma booking get took $1'`, "prismaBookingGetStart", "prismaBookingGetEnd");
  if (credentials?.length > 0 && !bypassBusyCalendarTimes) {
    const startConnectedCalendarsGet = performance.now();
    const calendarBusyTimes = await getBusyCalendarTimes(
      credentials,
      startTime,
      endTime,
      selectedCalendars,
      shouldServeCache
    );
    const endConnectedCalendarsGet = performance.now();
    logger.debug(
      `Connected Calendars get took ${
        endConnectedCalendarsGet - startConnectedCalendarsGet
      } ms for user ${username}`,
      JSON.stringify({
        eventTypeId,
        startTimeDate,
        endTimeDate,
        calendarBusyTimes,
      })
    );

    const openSeatsDateRanges = Object.keys(bookingSeatCountMap).map((key) => {
      const [start, end] = key.split("<>");
      return {
        start: new Date(start),
        end: new Date(end),
      };
    });

    if (rescheduleUid) {
      const originalRescheduleBooking = bookings.find((booking) => booking.uid === rescheduleUid);
      // calendar busy time from original rescheduled booking should not be blocked
      if (originalRescheduleBooking) {
        openSeatsDateRanges.push({
          start: new Date(originalRescheduleBooking.startTime),
          end: new Date(originalRescheduleBooking.endTime),
        });
      }
    }

    const result = subtract(
      calendarBusyTimes.map((value) => ({
        ...value,
        end: new Date(value.end),
        start: new Date(value.start),
      })),
      openSeatsDateRanges
    );

    busyTimes.push(
      ...result.map((busyTime) => ({
        ...busyTime,
        start: subtractTime(busyTime.start, afterEventBuffer || 0, "minute"),
        end: addTime(busyTime.end, beforeEventBuffer || 0, "minute"),
      }))
    );

    /*
    // TODO: Disabled until we can filter Zoom events by date. Also this is adding too much latency.
    const videoBusyTimes = (await getBusyVideoTimes(credentials)).filter(notEmpty);
    console.log("videoBusyTimes", videoBusyTimes);
    busyTimes.push(...videoBusyTimes);
    */
  }
  logger.debug(
    "getBusyTimes:",
    JSON.stringify({
      allBusyTimes: busyTimes,
    })
  );
  return busyTimes;
};

export const getBusyTimes = withReporting(_getBusyTimes, "getBusyTimes");

export function getStartEndDateforLimitCheck(
  startDate: string,
  endDate: string,
  bookingLimits?: IntervalLimit | null,
  durationLimits?: IntervalLimit | null
) {
  const startTimeAsDate = stringToDate(startDate);
  const endTimeAsDate = stringToDate(endDate);

  let limitDateFrom = stringToDate(startDate);
  let limitDateTo = stringToDate(endDate);

  // expand date ranges by absolute minimum required to apply limits
  // (yearly limits are handled separately for performance)
  for (const key of ["PER_MONTH", "PER_WEEK", "PER_DAY"] as Exclude<keyof IntervalLimit, "PER_YEAR">[]) {
    if (bookingLimits?.[key] || durationLimits?.[key]) {
      const unit = intervalLimitKeyToUnit(key);
      limitDateFrom = min([limitDateFrom, startOf(startTimeAsDate, unit as any)]);
      limitDateTo = max([limitDateTo, endOf(endTimeAsDate, unit as any)]);
    }
  }

  return { limitDateFrom, limitDateTo };
}

export async function getBusyTimesForLimitChecks(params: {
  userIds: number[];
  eventTypeId: number;
  startDate: string;
  endDate: string;
  rescheduleUid?: string | null;
  bookingLimits?: IntervalLimit | null;
  durationLimits?: IntervalLimit | null;
}) {
  const { userIds, eventTypeId, startDate, endDate, rescheduleUid, bookingLimits, durationLimits } = params;

  performance.mark("getBusyTimesForLimitChecksStart");

  let busyTimes: EventBusyDetails[] = [];

  if (!bookingLimits && !durationLimits) {
    return busyTimes;
  }

  const { limitDateFrom, limitDateTo } = getStartEndDateforLimitCheck(
    startDate,
    endDate,
    bookingLimits,
    durationLimits
  );

  logger.silly(
    `Fetch limit checks bookings in range ${limitDateFrom} to ${limitDateTo} for input ${JSON.stringify({
      eventTypeId,
      status: BookingStatus.ACCEPTED,
    })}`
  );

  const where: Prisma.BookingWhereInput = {
    userId: {
      in: userIds,
    },
    eventTypeId,
    status: BookingStatus.ACCEPTED,
    // FIXME: bookings that overlap on one side will never be counted
    startTime: {
      gte: limitDateFrom,
    },
    endTime: {
      lte: limitDateTo,
    },
  };

  if (rescheduleUid) {
    where.NOT = {
      uid: rescheduleUid,
    };
  }

  const bookings = await prisma.booking.findMany({
    where,
    select: {
      id: true,
      startTime: true,
      endTime: true,
      eventType: {
        select: {
          id: true,
        },
      },
      title: true,
      userId: true,
    },
  });

  busyTimes = bookings.map(({ id, startTime, endTime, eventType, title, userId }) => ({
    start: new Date(startTime),
    end: new Date(endTime),
    title,
    source: `eventType-${eventType?.id}-booking-${id}`,
    userId,
  }));

  logger.silly(`Fetch limit checks bookings for eventId: ${eventTypeId} ${JSON.stringify(busyTimes)}`);
  performance.mark("getBusyTimesForLimitChecksEnd");
  performance.measure(
    `prisma booking get for limits took $1'`,
    "getBusyTimesForLimitChecksStart",
    "getBusyTimesForLimitChecksEnd"
  );
  return busyTimes;
}

export default withReporting(_getBusyTimes, "getBusyTimes");
