import dayjs, { Dayjs } from "dayjs";
import { z } from "zod";

import getBusyTimes from "@calcom/core/getBusyTimes";
import { getWorkingHours } from "@calcom/lib/availability";
import { yyyymmdd } from "@calcom/lib/date-fns";

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

export type Slot = {
  time: Dayjs;
  attendees?: number;
  bookingUid?: string;
};

type getFilteredTimesProps = {
  times: dayjs.Dayjs[];
  busy: TimeRange[];
  eventLength: number;
  beforeBufferTime: number;
  afterBufferTime: number;
  currentSeats?: CurrentSeats[];
};

export const getFilteredTimes = (props: getFilteredTimesProps) => {
  const { times, busy, eventLength, beforeBufferTime, afterBufferTime, currentSeats } = props;
  const finalizationTime = times[times.length - 1]?.add(eventLength, "minutes");
  // Check for conflicts
  for (let i = times.length - 1; i >= 0; i -= 1) {
    // const totalSlotLength = eventLength + beforeBufferTime + afterBufferTime;
    // Check if the slot surpasses the user's availability end time
    const slotEndTimeWithAfterBuffer = times[i].add(eventLength + afterBufferTime, "minutes");
    if (slotEndTimeWithAfterBuffer.isAfter(finalizationTime, "minute")) {
      times.splice(i, 1);
    } else {
      const slotStartTime = times[i];
      const slotEndTime = times[i].add(eventLength, "minutes");
      const slotStartTimeWithBeforeBuffer = times[i].subtract(beforeBufferTime, "minutes");
      // If the event has seats then see if there is already a booking (want to show full bookings as well)
      if (currentSeats?.some((booking) => booking.startTime === slotStartTime.toISOString())) {
        break;
      }
      busy.every((busyTime): boolean => {
        const startTime = dayjs(busyTime.start);
        const endTime = dayjs(busyTime.end);
        // Check if start times are the same
        if (slotStartTime.isBetween(startTime, endTime, null, "[)")) {
          times.splice(i, 1);
        }
        // Check if slot end time is between start and end time
        else if (slotEndTime.isBetween(startTime, endTime)) {
          times.splice(i, 1);
        }
        // Check if startTime is between slot
        else if (startTime.isBetween(slotStartTime, slotEndTime)) {
          times.splice(i, 1);
        }
        // Check if timeslot has before buffer time space free
        else if (
          slotStartTimeWithBeforeBuffer.isBetween(
            startTime.subtract(beforeBufferTime, "minutes"),
            endTime.add(afterBufferTime, "minutes")
          )
        ) {
          times.splice(i, 1);
        }
        // Check if timeslot has after buffer time space free
        else if (
          slotEndTimeWithAfterBuffer.isBetween(
            startTime.subtract(beforeBufferTime, "minutes"),
            endTime.add(afterBufferTime, "minutes")
          )
        ) {
          times.splice(i, 1);
        } else {
          return true;
        }
        return false;
      });
    }
  }
  return times;
};

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
        beforeEventBuffer: true,
        afterEventBuffer: true,
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
    const currentSeats = eventType?.seatsPerTimeSlot
      ? await ctx.prisma.booking.findMany({
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
        })
      : [];

    const slots: Record<string, Slot[]> = {};

    let time = dayjs(startTime);
    do {
      const times = getSlots({
        inviteeDate: time,
        eventLength: eventType.length,
        workingHours,
        minimumBookingNotice: eventType.minimumBookingNotice,
        frequency: eventType.slotInterval || eventType.length,
      });
      const filterTimeProps = {
        times,
        busy: bufferedBusyTimes,
        eventLength: eventType.length,
        beforeBufferTime: eventType.beforeEventBuffer,
        afterBufferTime: eventType.afterEventBuffer,
        currentSeats,
      };
      slots[yyyymmdd(time.toDate())] = getFilteredTimes(filterTimeProps).map((time) => ({
        time,
        users: eventType.users,
        // Conditionally add the attendees and booking id to slots object if there is already a booking during that time
        ...(currentSeats?.some((booking) => booking.startTime.toISOString() === time.toISOString()) && {
          attendees:
            currentSeats[
              currentSeats.findIndex((booking) => booking.startTime.toISOString() === time.toISOString())
            ]._count.attendees,
          bookingUid:
            currentSeats[
              currentSeats.findIndex((booking) => booking.startTime.toISOString() === time.toISOString())
            ].uid,
        }),
      }));
      time = time.add(1, "day");
    } while (time.isBefore(endTime));

    return {
      slots,
    };
  },
});
