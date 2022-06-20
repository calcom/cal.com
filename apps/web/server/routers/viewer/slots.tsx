import { SchedulingType } from "@prisma/client";
import dayjs, { Dayjs } from "dayjs";
import { z } from "zod";

import type { CurrentSeats } from "@calcom/core/getUserAvailability";
import { getUserAvailability } from "@calcom/core/getUserAvailability";
import { yyyymmdd } from "@calcom/lib/date-fns";
import { availabilityUserSelect } from "@calcom/prisma";
import { stringToDayjs } from "@calcom/prisma/zod-utils";
import { TimeRange, WorkingHours } from "@calcom/types/schedule";

import isOutOfBounds from "@lib/isOutOfBounds";
import getSlots from "@lib/slots";

import { createRouter } from "@server/createRouter";
import { TRPCError } from "@trpc/server";

const getScheduleSchema = z
  .object({
    // startTime ISOString
    startTime: stringToDayjs,
    // endTime ISOString
    endTime: stringToDayjs,
    // Event type ID
    eventTypeId: z.number().optional(),
    // or list of users (for dynamic events)
    usernameList: z.array(z.string()).optional(),
  })
  .refine(
    (data) => !!data.eventTypeId || !!data.usernameList,
    "Either usernameList or eventTypeId should be filled in."
  );

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
  busy: (TimeRange | { start: string; end: string })[];
  workingHours: WorkingHours[];
  eventLength: number;
  beforeBufferTime: number;
  afterBufferTime: number;
  currentSeats?: CurrentSeats;
}) => {
  if (
    !workingHours.some((workingHour) => {
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
        id: true,
        minimumBookingNotice: true,
        length: true,
        seatsPerTimeSlot: true,
        timeZone: true,
        slotInterval: true,
        beforeEventBuffer: true,
        afterEventBuffer: true,
        schedulingType: true,
        periodType: true,
        periodStartDate: true,
        periodEndDate: true,
        periodCountCalendarDays: true,
        periodDays: true,
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
            username: true,
            ...availabilityUserSelect,
          },
        },
      },
    });

    if (!eventType) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const { startTime, endTime } = input;
    if (!startTime.isValid() || !endTime.isValid()) {
      throw new TRPCError({ message: "Invalid time range given.", code: "BAD_REQUEST" });
    }

    let currentSeats: CurrentSeats | undefined = undefined;

    const userSchedules = await Promise.all(
      eventType.users.map(async (currentUser) => {
        const {
          busy,
          workingHours,
          currentSeats: _currentSeats,
        } = await getUserAvailability(
          {
            userId: currentUser.id,
            dateFrom: startTime.format(),
            dateTo: endTime.format(),
            eventTypeId: input.eventTypeId,
          },
          { user: currentUser, eventType, currentSeats }
        );
        if (!currentSeats && _currentSeats) currentSeats = _currentSeats;

        return {
          workingHours,
          busy,
        };
      })
    );

    const workingHours = userSchedules.flatMap((s) => s.workingHours);
    const slots: Record<string, Slot[]> = {};
    const availabilityCheckProps = {
      eventLength: eventType.length,
      beforeBufferTime: eventType.beforeEventBuffer,
      afterBufferTime: eventType.afterEventBuffer,
      currentSeats,
    };
    const isWithinBounds = (_time: Parameters<typeof isOutOfBounds>[0]) =>
      !isOutOfBounds(_time, {
        periodType: eventType.periodType,
        periodStartDate: eventType.periodStartDate,
        periodEndDate: eventType.periodEndDate,
        periodCountCalendarDays: eventType.periodCountCalendarDays,
        periodDays: eventType.periodDays,
      });

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
      const filterStrategy =
        !eventType.schedulingType || eventType.schedulingType === SchedulingType.COLLECTIVE
          ? ("every" as const)
          : ("some" as const);
      const filteredTimes = times
        .filter(isWithinBounds)
        .filter((time) =>
          userSchedules[filterStrategy]((schedule) =>
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
