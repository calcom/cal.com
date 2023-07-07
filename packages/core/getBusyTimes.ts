import type { Credential } from "@prisma/client";

import { getBusyCalendarTimes } from "@calcom/core/CalendarManager";
import dayjs from "@calcom/dayjs";
import { subtract } from "@calcom/lib/date-ranges";
import logger from "@calcom/lib/logger";
import { performance } from "@calcom/lib/server/perfObserver";
import prisma from "@calcom/prisma";
import type { SelectedCalendar } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import type { EventBusyDetails } from "@calcom/types/Calendar";

export async function getBusyTimes(params: {
  credentials: Credential[];
  userId: number;
  username: string;
  organizationSlug?: string | null | undefined;
  eventTypeId?: number;
  startTime: string;
  beforeEventBuffer?: number;
  afterEventBuffer?: number;
  endTime: string;
  selectedCalendars: SelectedCalendar[];
  seatedEvent?: boolean;
}) {
  const {
    credentials,
    userId,
    username,
    eventTypeId,
    startTime,
    endTime,
    organizationSlug,
    beforeEventBuffer,
    afterEventBuffer,
    selectedCalendars,
    seatedEvent,
  } = params;
  logger.silly(
    `Checking Busy time from Cal Bookings in range ${startTime} to ${endTime} for input ${JSON.stringify({
      userId,
      eventTypeId,
      status: BookingStatus.ACCEPTED,
    })}`
  );
  // get user email for attendee checking.
  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id: userId,
    },
    select: {
      email: true,
    },
  });

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

  const sharedQuery = {
    startTime: { gte: new Date(startTime) },
    endTime: { lte: new Date(endTime) },
    status: {
      in: [BookingStatus.ACCEPTED],
    },
  };
  // Find bookings that block this user from hosting further bookings.
  const bookings = await prisma.booking.findMany({
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
              email: user.email,
            },
          },
        },
      ],
    },
    select: {
      id: true,
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
        const bookedAt = dayjs(startTime).utc().format() + "<>" + dayjs(endTime).utc().format();
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

  logger.silly(`Busy Time from Cal Bookings ${JSON.stringify(busyTimes)}`);
  performance.mark("prismaBookingGetEnd");
  performance.measure(`prisma booking get took $1'`, "prismaBookingGetStart", "prismaBookingGetEnd");
  if (credentials?.length > 0) {
    const startConnectedCalendarsGet = performance.now();
    const calendarBusyTimes = await getBusyCalendarTimes(
      username,
      credentials,
      startTime,
      endTime,
      selectedCalendars,
      organizationSlug
    );
    const endConnectedCalendarsGet = performance.now();
    logger.debug(
      `Connected Calendars get took ${
        endConnectedCalendarsGet - startConnectedCalendarsGet
      } ms for user ${username}`
    );

    const openSeatsDateRanges = Object.keys(bookingSeatCountMap).map((key) => {
      const [start, end] = key.split("<>");
      return {
        start: dayjs(start),
        end: dayjs(end),
      };
    });

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
  return busyTimes;
}

export default getBusyTimes;
