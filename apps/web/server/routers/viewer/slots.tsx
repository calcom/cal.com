import { SchedulingType } from "@prisma/client";
import dayjs, { Dayjs } from "dayjs";
import { z } from "zod";

import type { CurrentSeats } from "@calcom/core/getUserAvailability";
import { getUserAvailability } from "@calcom/core/getUserAvailability";
import { availabilityUserSelect } from "@calcom/prisma";
import { TimeRange } from "@calcom/types/schedule";

import isOutOfBounds from "@lib/isOutOfBounds";
import getSlots from "@lib/slots";

import { createRouter } from "@server/createRouter";
import { TRPCError } from "@trpc/server";

const getScheduleSchema = z
  .object({
    // startTime ISOString
    startTime: z.string(),
    // endTime ISOString
    endTime: z.string(),
    // Event type ID
    eventTypeId: z.number().optional(),
    // invitee timezone
    timeZone: z.string().optional(),
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
  eventLength,
  beforeBufferTime,
  currentSeats,
}: {
  time: Dayjs;
  busy: (TimeRange | { start: string; end: string })[];
  eventLength: number;
  beforeBufferTime: number;
  currentSeats?: CurrentSeats;
}) => {
  if (currentSeats?.some((booking) => booking.startTime.toISOString() === time.toISOString())) {
    return true;
  }

  const slotEndTime = time.add(eventLength, "minutes").utc();
  const slotStartTime = time.subtract(beforeBufferTime, "minutes").utc();

  return busy.every((busyTime) => {
    const startTime = dayjs.utc(busyTime.start);
    const endTime = dayjs.utc(busyTime.end);
    if (
      slotStartTime.isBetween(startTime, endTime, null, "[)") ||
      slotEndTime.isBetween(startTime, endTime, null, "(]")
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

    const startTime =
      input.timeZone === "Etc/GMT"
        ? dayjs.utc(input.startTime)
        : dayjs(input.startTime).utc().tz(input.timeZone);
    const endTime =
      input.timeZone === "Etc/GMT" ? dayjs.utc(input.endTime) : dayjs(input.endTime).utc().tz(input.timeZone);

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
            afterEventBuffer: eventType.afterEventBuffer,
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

    let time = startTime;

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

      slots[time.format("YYYY-MM-DD")] = filteredTimes.map((time) => ({
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
