import dayjs from "dayjs";
import { z } from "zod";

import { getWorkingHours } from "@calcom/lib/availability";
import { yyyymmdd } from "@calcom/lib/date-fns";

import getBusyTimes from "@lib/getBusyTimes";
import { getFilteredTimes } from "@lib/hooks/useSlots";
import getSlots from "@lib/slots";

import { createRouter } from "@server/createRouter";
import { TRPCError } from "@trpc/server";

const getScheduleSchema = z.object({
  // startTime ISOString
  startTime: z.string(),
  // endTime ISOString
  endTime: z.string(),
  // Event type ID
  eventTypeId: z.number(),
  // Additional organizers for dynamic events.
  additionalOrganizers: z.array(z.string()).optional(),
});

export const slotsRouter = createRouter().query("getSchedule", {
  input: getScheduleSchema,
  async resolve({ input, ctx }) {
    const eventType = await ctx.prisma.eventType.findUnique({
      where: {
        id: input.eventTypeId,
      },
      select: {
        minimumBookingNotice: true,
        length: true,
        seatsPerTimeSlot: true,
        timeZone: true,
        slotInterval: true,
        schedule: {
          select: {
            availability: true,
            timeZone: true,
          },
        },
        availability: {
          select: {
            startTime: true,
            endTime: true,
            days: true,
          },
        },
        users: {
          select: {
            id: true,
            bufferTime: true,
            schedules: {
              select: {
                id: true,
                availability: true,
                timeZone: true,
              },
            },
            selectedCalendars: true,
            credentials: true,
            defaultScheduleId: true,
            availability: true,
            timeZone: true,
          },
        },
      },
    });

    if (!eventType) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const currentUser = eventType.users[0];

    const startTime = dayjs(input.startTime);
    const endTime = dayjs(input.endTime);
    if (!startTime.isValid() || !endTime.isValid()) {
      throw new TRPCError({ message: "Invalid time range given.", code: "BAD_REQUEST" });
    }

    const busyTimes = await getBusyTimes({
      credentials: currentUser.credentials,
      startTime: startTime.format(),
      endTime: endTime.format(),
      eventTypeId: input.eventTypeId,
      userId: currentUser.id,
      selectedCalendars: currentUser.selectedCalendars,
    });

    const bufferedBusyTimes = busyTimes.map((a) => ({
      start: dayjs(a.start).subtract(currentUser.bufferTime, "minute"),
      end: dayjs(a.end).add(currentUser.bufferTime, "minute"),
    }));

    console.log(bufferedBusyTimes);

    const schedule = eventType?.schedule
      ? { ...eventType?.schedule }
      : {
          ...currentUser.schedules.filter(
            (schedule) => !currentUser.defaultScheduleId || schedule.id === currentUser.defaultScheduleId
          )[0],
        };

    const timeZone = schedule.timeZone || eventType?.timeZone || currentUser.timeZone;

    const workingHours = getWorkingHours(
      {
        timeZone,
      },
      schedule.availability ||
        (eventType?.availability.length ? eventType.availability : currentUser.availability)
    );

    /* Current logic is if a booking is in a time slot mark it as busy, but seats can have more than one attendee so grab
    current bookings with a seats event type and display them on the calendar, even if they are full */
    let currentSeats;
    if (eventType?.seatsPerTimeSlot) {
      currentSeats = await ctx.prisma.booking.findMany({
        where: {
          eventTypeId: input.eventTypeId,
          startTime: {
            gte: startTime.format(),
            lte: endTime.format(),
          },
        },
        select: {
          uid: true,
          startTime: true,
          _count: {
            select: {
              attendees: true,
            },
          },
        },
      });
    }

    const slots: Record<string, unknown[]> = {};

    let time = dayjs(startTime);
    do {
      slots[yyyymmdd(time.toDate())] = getSlots({
        inviteeDate: time,
        eventLength: eventType.length,
        workingHours,
        minimumBookingNotice: eventType.minimumBookingNotice,
        frequency: eventType.slotInterval || eventType.length,
      });
      time = time.add(1, "day");
    } while (time.isBefore(endTime));

    return {
      slots,
    };
  },
});
