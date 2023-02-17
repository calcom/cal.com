import { BookingStatus, Credential, SelectedCalendar } from "@prisma/client";

import { getBusyCalendarTimes } from "@calcom/core/CalendarManager";
import dayjs from "@calcom/dayjs";
import logger from "@calcom/lib/logger";
import { performance } from "@calcom/lib/server/perfObserver";
import prisma from "@calcom/prisma";
import type { EventBusyDetails } from "@calcom/types/Calendar";

export async function getBusyTimes(params: {
  credentials: Credential[];
  userId: number;
  username: string;
  eventTypeId?: number;
  startTime: string;
  beforeEventBuffer?: number;
  afterEventBuffer?: number;
  endTime: string;
}) {
  const {
    credentials,
    userId,
    username,
    eventTypeId,
    startTime,
    endTime,
    beforeEventBuffer,
    afterEventBuffer,
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
   * is a booking they own OR host.
   *
   * Therefore this query does the following:
   * - Performs a query for all EventType id's where this user is a host
   * - Performs a query for all bookings where:
   *   - The given booking is owned by this user, or..
   *   - The given booking's EventType is hosted by this user
   *
   * See further discussion within this GH issue:
   * https://github.com/calcom/cal.com/issues/6374
   *
   * NOTE: Changes here will likely require changes to some mocking
   *  logic within getSchedule.test.ts:addBookings
   */
  performance.mark("prismaBookingGetStart");
  const busyTimes: EventBusyDetails[] =
    // Getting all EventTypes ID's hosted by this user
    await prisma.host
      .findMany({
        where: {
          userId: {
            equals: userId,
          },
        },
        select: {
          eventTypeId: true,
        },
      })

      // Converting the response object into an array
      .then((thisUserHostedEvents) => thisUserHostedEvents.map((e) => e.eventTypeId))

      // Finding all bookings owned OR hosted by this user
      .then((thisUserHostedEventIds) => {
        // This gets applied to both conditions
        const sharedQuery = {
          startTime: { gte: new Date(startTime) },
          endTime: { lte: new Date(endTime) },
          status: {
            in: [BookingStatus.ACCEPTED],
          },
        };

        return prisma.booking.findMany({
          where: {
            OR: [
              // Bookings owned by this user
              {
                ...sharedQuery,
                userId,
              },

              // Bookings with an EventType ID that's hosted by this user
              {
                ...sharedQuery,
                eventTypeId: {
                  in: thisUserHostedEventIds,
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
              },
            },
          },
        });
      })
      .then((bookings) =>
        bookings.map(({ startTime, endTime, title, id, eventType }) => ({
          start: dayjs(startTime)
            .subtract((eventType?.beforeEventBuffer || 0) + (afterEventBuffer || 0), "minute")
            .toDate(),
          end: dayjs(endTime)
            .add((eventType?.afterEventBuffer || 0) + (beforeEventBuffer || 0), "minute")
            .toDate(),
          title,
          source: `eventType-${eventType?.id}-booking-${id}`,
        }))
      );
  logger.silly(`Busy Time from Cal Bookings ${JSON.stringify(busyTimes)}`);
  performance.mark("prismaBookingGetEnd");
  performance.measure(`prisma booking get took $1'`, "prismaBookingGetStart", "prismaBookingGetEnd");
  if (credentials?.length > 0) {
    const calendarBusyTimes = await getBusyCalendarTimes(username, credentials, startTime, endTime);
    busyTimes.push(
      ...calendarBusyTimes.map((value) => ({
        ...value,
        end: dayjs(value.end)
          .add(beforeEventBuffer || 0, "minute")
          .toDate(),
        start: dayjs(value.start)
          .subtract(afterEventBuffer || 0, "minute")
          .toDate(),
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
