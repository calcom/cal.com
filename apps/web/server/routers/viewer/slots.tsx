import { SchedulingType } from "@prisma/client";
import dayjs, { Dayjs } from "dayjs";
import { z } from "zod";

import getBusyTimes from "@calcom/core/getBusyTimes";
import { getWorkingHours } from "@calcom/lib/availability";
import { yyyymmdd } from "@calcom/lib/date-fns";
import { TimeRange, WorkingHours } from "@calcom/types/schedule";

import getSlots from "@lib/slots";
import { CurrentSeats } from "@lib/types/schedule";

import { createRouter } from "@server/createRouter";
import { TRPCError } from "@trpc/server";

const getScheduleSchema = z.object({
  // startTime ISOString
  startTime: z.string(),
  // endTime ISOString
  endTime: z.string(),
  // Event type ID
  eventTypeId: z.number(),
  // or list of users (for dynamic events)
  // usernameList: z.array(z.string()).optional(),
});

export type Slot = {
  time: string;
  attendees?: number;
  bookingUid?: string;
  users?: string[];
};

const checkForAvailability = ({
  time,
  busy,
  workingHours,
  eventLength,
  beforeBufferTime,
  afterBufferTime,
  currentSeats,
}: {
  time: Dayjs;
  busy: TimeRange[];
  workingHours: WorkingHours[];
  eventLength: number;
  beforeBufferTime: number;
  afterBufferTime: number;
  currentSeats?: CurrentSeats[];
}) => {
  if (
    !workingHours.every((workingHour) => {
      if (!workingHour.days.includes(time.day())) {
        return false;
      }
      if (
        !time.isBetween(
          time.utc().startOf("day").add(workingHour.startTime, "minutes"),
          time.utc().startOf("day").add(workingHour.endTime, "minutes"),
          null,
          "[)"
        )
      ) {
        return false;
      }
      return true;
    })
  ) {
    return false;
  }

  if (currentSeats?.some((booking) => booking.startTime.toISOString() === time.toISOString())) {
    return true;
  }

  const slotEndTime = time.add(eventLength, "minutes");
  const slotStartTimeWithBeforeBuffer = time.subtract(beforeBufferTime, "minutes");
  const slotEndTimeWithAfterBuffer = time.add(eventLength + afterBufferTime, "minutes");

  return busy.every((busyTime): boolean => {
    const startTime = dayjs(busyTime.start);
    const endTime = dayjs(busyTime.end);
    // Check if start times are the same
    if (time.isBetween(startTime, endTime, null, "[)")) {
      return false;
    }
    // Check if slot end time is between start and end time
    else if (slotEndTime.isBetween(startTime, endTime)) {
      return false;
    }
    // Check if startTime is between slot
    else if (startTime.isBetween(time, slotEndTime)) {
      return false;
    }
    // Check if timeslot has before buffer time space free
    else if (
      slotStartTimeWithBeforeBuffer.isBetween(
        startTime.subtract(beforeBufferTime, "minutes"),
        endTime.add(afterBufferTime, "minutes")
      )
    ) {
      return false;
    }
    // Check if timeslot has after buffer time space free
    else if (
      slotEndTimeWithAfterBuffer.isBetween(
        startTime.subtract(beforeBufferTime, "minutes"),
        endTime.add(afterBufferTime, "minutes")
      )
    ) {
      return false;
    }
    return true;
  });
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
        schedulingType: true,
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
            username: true,
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

    const startTime = dayjs(input.startTime);
    const endTime = dayjs(input.endTime);
    if (!startTime.isValid() || !endTime.isValid()) {
      throw new TRPCError({ message: "Invalid time range given.", code: "BAD_REQUEST" });
    }

    const userSchedules = await Promise.all(
      eventType.users.map(async (currentUser) => {
        const schedule = currentUser.schedules.filter(
          (schedule) => !currentUser.defaultScheduleId || schedule.id === currentUser.defaultScheduleId
        )[0];

        const workingHours = getWorkingHours(
          {
            timeZone: currentUser.timeZone,
          },
          schedule.availability || currentUser.availability
        );

        const busy = await getBusyTimes({
          credentials: currentUser.credentials,
          startTime: startTime.format(),
          endTime: endTime.format(),
          eventTypeId: input.eventTypeId,
          userId: currentUser.id,
          selectedCalendars: currentUser.selectedCalendars,
        });

        return {
          workingHours,
          busy: busy.map((a) => ({
            start: dayjs(a.start).subtract(currentUser.bufferTime, "minute").toDate(),
            end: dayjs(a.end).add(currentUser.bufferTime, "minute").toDate(),
          })),
        };
      })
    );

    const schedule = eventType?.schedule;
    const timeZone = schedule?.timeZone || eventType?.timeZone || undefined;

    const workingHours = getWorkingHours(
      {
        timeZone,
      },
      schedule?.availability || (eventType?.availability.length ? eventType.availability : [])
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

    const availabilityCheckProps = {
      eventLength: eventType.length,
      beforeBufferTime: eventType.beforeEventBuffer,
      afterBufferTime: eventType.afterEventBuffer,
      currentSeats,
    };

    let time = dayjs(startTime);
    do {
      // get slots retrieves the available times for a given day
      const times = getSlots({
        inviteeDate: time,
        eventLength: eventType.length,
        workingHours,
        minimumBookingNotice: eventType.minimumBookingNotice,
        frequency: eventType.slotInterval || eventType.length,
      });

      // if ROUND_ROBIN - slots stay available on some() - if normal / COLLECTIVE - slots only stay available on every()
      const filteredTimes =
        !eventType.schedulingType || eventType.schedulingType === SchedulingType.COLLECTIVE
          ? times.filter((time) =>
              userSchedules.every((schedule) =>
                checkForAvailability({ time, ...schedule, ...availabilityCheckProps })
              )
            )
          : times.filter((time) =>
              userSchedules.some((schedule) =>
                checkForAvailability({ time, ...schedule, ...availabilityCheckProps })
              )
            );

      slots[yyyymmdd(time.toDate())] = filteredTimes.map((time) => ({
        time: time.toISOString(),
        users: eventType.users.map((user) => user.username || ""),
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
