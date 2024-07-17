import type { Booking, EventType } from "@prisma/client";

import { getBusyCalendarTimes } from "@calcom/core/CalendarManager";
import dayjs from "@calcom/dayjs";
import { subtract } from "@calcom/lib/date-ranges";
import { intervalLimitKeyToUnit } from "@calcom/lib/intervalLimit";
import logger from "@calcom/lib/logger";
import { getPiiFreeBooking } from "@calcom/lib/piiFreeData";
import { performance } from "@calcom/lib/server/perfObserver";
import prisma from "@calcom/prisma";
import type { Prisma, SelectedCalendar } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import { stringToDayjs } from "@calcom/prisma/zod-utils";
import type { EventBusyDetails, IntervalLimit } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import { getDefinedBufferTimes } from "../features/eventtypes/lib/getDefinedBufferTimes";

export async function getBusyTimes(params: {
  credentials: CredentialPayload[];
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
}) {
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
    rescheduleUid && duration ? dayjs(startTime).subtract(duration, "minute").toDate() : new Date(startTime);
  const endTimeDate =
    rescheduleUid && duration ? dayjs(endTime).add(duration, "minute").toDate() : new Date(endTime);

  // to also get bookings that are outside of start and end time, but the buffer falls within the start and end time
  const definedBufferTimes = getDefinedBufferTimes();
  const maxBuffer = definedBufferTimes[definedBufferTimes.length - 1];
  const startTimeAdjustedWithMaxBuffer = dayjs(startTimeDate).subtract(maxBuffer, "minute").toDate();
  const endTimeAdjustedWithMaxBuffer = dayjs(endTimeDate).add(maxBuffer, "minute").toDate();

  // startTime is less than endTimeDate and endTime grater than startTimeDate
  const sharedQuery = {
    startTime: { lte: endTimeAdjustedWithMaxBuffer },
    endTime: { gte: startTimeAdjustedWithMaxBuffer },
    status: {
      in: [BookingStatus.ACCEPTED],
    },
  };
  // INFO: Refactored to allow this method to take in a list of current bookings for the user.
  // Will keep support for retrieving a user's bookings if the caller does not already supply them.
  // This function is called from multiple places but we aren't refactoring all of them at this moment
  // to avoid potential side effects.
  const bookings = params.currentBookings
    ? params.currentBookings
    : await prisma.booking.findMany({
        where: {
          OR: [
            // User is primary host (individual events, or primary organizer)
            {
              ...sharedQuery,
              userId,
            },
            // The current user has a different booking at this time he/she attends
            {
              ...sharedQuery,
              attendees: {
                some: {
                  email: userEmail,
                },
              },
            },
          ],
        },
        select: {
          id: true,
          uid: true,
          userId: true,
          startTime: true,
          endTime: true,
          title: true,
          eventType: {
            select: {
              id: true,
              afterEventBuffer: true,
              beforeEventBuffer: true,
              seatsPerTimeSlot: true,
            },
          },
          ...(seatedEvent && {
            _count: {
              select: {
                seatsReferences: true,
              },
            },
          }),
        },
      });

  const bookingSeatCountMap: { [x: string]: number } = {};
  const busyTimes = bookings.reduce(
    (aggregate: EventBusyDetails[], { id, startTime, endTime, eventType, title, ...rest }) => {
      if (rest._count?.seatsReferences) {
        const bookedAt = `${dayjs(startTime).utc().format()}<>${dayjs(endTime).utc().format()}`;
        bookingSeatCountMap[bookedAt] = bookingSeatCountMap[bookedAt] || 0;
        bookingSeatCountMap[bookedAt]++;
        // Seat references on the current event are non-blocking until the event is fully booked.
        if (
          // there are still seats available.
          bookingSeatCountMap[bookedAt] < (eventType?.seatsPerTimeSlot || 1) &&
          // and this is the seated event, other event types should be blocked.
          eventTypeId === eventType?.id
        ) {
          // then we do not add the booking to the busyTimes.
          return aggregate;
        }
        // if it does get blocked at this point; we remove the bookingSeatCountMap entry
        // doing this allows using the map later to remove the ranges from calendar busy times.
        delete bookingSeatCountMap[bookedAt];
      }
      if (rest.uid === rescheduleUid) {
        return aggregate;
      }
      aggregate.push({
        start: dayjs(startTime)
          .subtract((eventType?.beforeEventBuffer || 0) + (afterEventBuffer || 0), "minute")
          .toDate(),
        end: dayjs(endTime)
          .add((eventType?.afterEventBuffer || 0) + (beforeEventBuffer || 0), "minute")
          .toDate(),
        title,
        source: `eventType-${eventType?.id}-booking-${id}`,
      });
      return aggregate;
    },
    []
  );

  logger.debug(
    `Busy Time from Cal Bookings ${JSON.stringify({
      busyTimes,
      bookings: bookings?.map((booking) => getPiiFreeBooking(booking)),
      numCredentials: credentials?.length,
    })}`
  );
  performance.mark("prismaBookingGetEnd");
  performance.measure(`prisma booking get took $1'`, "prismaBookingGetStart", "prismaBookingGetEnd");
  if (credentials?.length > 0) {
    const startConnectedCalendarsGet = performance.now();
    const calendarBusyTimes = await getBusyCalendarTimes(
      username,
      credentials,
      startTime,
      endTime,
      selectedCalendars
    );
    const endConnectedCalendarsGet = performance.now();
    logger.debug(
      `Connected Calendars get took ${
        endConnectedCalendarsGet - startConnectedCalendarsGet
      } ms for user ${username}`,
      JSON.stringify({
        calendarBusyTimes,
      })
    );

    const openSeatsDateRanges = Object.keys(bookingSeatCountMap).map((key) => {
      const [start, end] = key.split("<>");
      return {
        start: dayjs(start),
        end: dayjs(end),
      };
    });

    if (rescheduleUid) {
      const originalRescheduleBooking = bookings.find((booking) => booking.uid === rescheduleUid);
      // calendar busy time from original rescheduled booking should not be blocked
      if (originalRescheduleBooking) {
        openSeatsDateRanges.push({
          start: dayjs(originalRescheduleBooking.startTime),
          end: dayjs(originalRescheduleBooking.endTime),
        });
      }
    }

    const result = subtract(
      calendarBusyTimes.map((value) => ({
        ...value,
        end: dayjs(value.end),
        start: dayjs(value.start),
      })),
      openSeatsDateRanges
    );

    busyTimes.push(
      ...result.map((busyTime) => ({
        ...busyTime,
        start: busyTime.start.subtract(afterEventBuffer || 0, "minute").toDate(),
        end: busyTime.end.add(beforeEventBuffer || 0, "minute").toDate(),
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
  const startTimeAsDayJs = stringToDayjs(startDate);
  const endTimeAsDayJs = stringToDayjs(endDate);

  performance.mark("getBusyTimesForLimitChecksStart");

  let busyTimes: EventBusyDetails[] = [];

  if (!bookingLimits && !durationLimits) {
    return busyTimes;
  }

  let limitDateFrom = stringToDayjs(startDate);
  let limitDateTo = stringToDayjs(endDate);

  // expand date ranges by absolute minimum required to apply limits
  // (yearly limits are handled separately for performance)
  for (const key of ["PER_MONTH", "PER_WEEK", "PER_DAY"] as Exclude<keyof IntervalLimit, "PER_YEAR">[]) {
    if (bookingLimits?.[key] || durationLimits?.[key]) {
      const unit = intervalLimitKeyToUnit(key);
      limitDateFrom = dayjs.min(limitDateFrom, startTimeAsDayJs.startOf(unit));
      limitDateTo = dayjs.max(limitDateTo, endTimeAsDayJs.endOf(unit));
    }
  }
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
      gte: limitDateFrom.toDate(),
    },
    endTime: {
      lte: limitDateTo.toDate(),
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
    start: dayjs(startTime).toDate(),
    end: dayjs(endTime).toDate(),
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

export default getBusyTimes;
