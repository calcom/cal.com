import { SchedulingType } from "@prisma/client";
import { z } from "zod";

import type { CurrentSeats } from "@calcom/core/getUserAvailability";
import { getUserAvailability } from "@calcom/core/getUserAvailability";
import dayjs, { Dayjs } from "@calcom/dayjs";
import { getDefaultEvent } from "@calcom/lib/defaultEvents";
import isOutOfBounds from "@calcom/lib/isOutOfBounds";
import logger from "@calcom/lib/logger";
import { performance } from "@calcom/lib/server/perfObserver";
import getSlots from "@calcom/lib/slots";
import prisma, { availabilityUserSelect } from "@calcom/prisma";
import { TimeRange } from "@calcom/types/schedule";
import { ValuesType } from "@calcom/types/utils";

import { TRPCError } from "@trpc/server";

import { createRouter } from "../../createRouter";

const getScheduleSchema = z
  .object({
    // startTime ISOString
    startTime: z.string(),
    // endTime ISOString
    endTime: z.string(),
    // Event type ID
    eventTypeId: z.number().int().optional(),
    // Event type slug
    eventTypeSlug: z.string(),
    // invitee timezone
    timeZone: z.string().optional(),
    // or list of users (for dynamic events)
    usernameList: z.array(z.string()).optional(),
    debug: z.boolean().optional(),
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

    if (endTime.isBefore(slotStartTime) || startTime.isAfter(slotEndTime)) {
      return true;
    }

    if (slotStartTime.isBetween(startTime, endTime, null, "[)")) {
      return false;
    } else if (slotEndTime.isBetween(startTime, endTime, null, "(]")) {
      return false;
    }

    // Check if start times are the same
    if (time.utc().isBetween(startTime, endTime, null, "[)")) {
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

    return true;
  });
};

export const slotsRouter = createRouter().query("getSchedule", {
  input: getScheduleSchema,
  async resolve({ input, ctx }) {
    return await getSchedule(input, ctx);
  },
});

export async function getSchedule(input: z.infer<typeof getScheduleSchema>, ctx: { prisma: typeof prisma }) {
  if (input.debug === true) {
    logger.setSettings({ minLevel: "debug" });
  }
  if (process.env.INTEGRATION_TEST_MODE === "true") {
    logger.setSettings({ minLevel: "silly" });
  }
  const startPrismaEventTypeGet = performance.now();
  const eventTypeObject = await ctx.prisma.eventType.findUnique({
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
          ...availabilityUserSelect,
        },
      },
    },
  });

  const isDynamicBooking = !input.eventTypeId;
  // For dynamic booking, we need to get and update user credentials, schedule and availability in the eventTypeObject as they're required in the new availability logic
  const dynamicEventType = getDefaultEvent(input.eventTypeSlug);
  let dynamicEventTypeObject = dynamicEventType;

  if (isDynamicBooking) {
    const users = await ctx.prisma.user.findMany({
      where: {
        username: {
          in: input.usernameList,
        },
      },
      select: {
        allowDynamicBooking: true,
        ...availabilityUserSelect,
      },
    });
    const isDynamicAllowed = !users.some((user) => !user.allowDynamicBooking);
    if (!isDynamicAllowed) {
      throw new TRPCError({
        message: "Some of the users in this group do not allow dynamic booking",
        code: "UNAUTHORIZED",
      });
    }
    dynamicEventTypeObject = Object.assign({}, dynamicEventType, {
      users,
    });
  }
  const eventType = isDynamicBooking ? dynamicEventTypeObject : eventTypeObject;

  const endPrismaEventTypeGet = performance.now();
  logger.debug(
    `Prisma eventType get took ${endPrismaEventTypeGet - startPrismaEventTypeGet}ms for event:${
      input.eventTypeId
    }`
  );
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
          username: currentUser.username || "",
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

  // flatMap does not work for COLLECTIVE events
  const workingHours = userSchedules?.reduce(
    (currentValue: ValuesType<typeof userSchedules>["workingHours"], s) => {
      // Collective needs to be exclusive of overlap throughout - others inclusive.
      if (eventType.schedulingType === SchedulingType.COLLECTIVE) {
        // taking the first item as a base
        if (!currentValue.length) {
          currentValue.push(...s.workingHours);
          return currentValue;
        }
        // the remaining logic subtracts
        return s.workingHours.reduce((compare, workingHour) => {
          return compare.map((c) => {
            const intersect = workingHour.days.filter((day) => c.days.includes(day));
            return intersect.length
              ? {
                  days: intersect,
                  startTime: Math.max(workingHour.startTime, c.startTime),
                  endTime: Math.min(workingHour.endTime, c.endTime),
                }
              : c;
          });
        }, currentValue);
      } else {
        // flatMap for ROUND_ROBIN and individuals
        currentValue.push(...s.workingHours);
      }
      return currentValue;
    },
    []
  );

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
  let getSlotsTime = 0;
  let checkForAvailabilityTime = 0;
  let getSlotsCount = 0;
  let checkForAvailabilityCount = 0;

  do {
    const startGetSlots = performance.now();
    // get slots retrieves the available times for a given day
    const times = getSlots({
      inviteeDate: time,
      eventLength: eventType.length,
      workingHours,
      minimumBookingNotice: eventType.minimumBookingNotice,
      frequency: eventType.slotInterval || eventType.length,
    });

    const endGetSlots = performance.now();
    getSlotsTime += endGetSlots - startGetSlots;
    getSlotsCount++;
    // if ROUND_ROBIN - slots stay available on some() - if normal / COLLECTIVE - slots only stay available on every()
    const filterStrategy =
      !eventType.schedulingType || eventType.schedulingType === SchedulingType.COLLECTIVE
        ? ("every" as const)
        : ("some" as const);

    const filteredTimes = times.filter(isWithinBounds).filter((time) =>
      userSchedules[filterStrategy]((schedule) => {
        const startCheckForAvailability = performance.now();
        const result = checkForAvailability({ time, ...schedule, ...availabilityCheckProps });
        const endCheckForAvailability = performance.now();
        checkForAvailabilityCount++;
        checkForAvailabilityTime += endCheckForAvailability - startCheckForAvailability;
        return result;
      })
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

  logger.debug(`getSlots took ${getSlotsTime}ms and executed ${getSlotsCount} times`);

  logger.debug(
    `checkForAvailability took ${checkForAvailabilityTime}ms and executed ${checkForAvailabilityCount} times`
  );
  logger.silly(`Available slots: ${JSON.stringify(slots)}`);

  return {
    slots,
  };
}
