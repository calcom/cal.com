import { SchedulingType, EventType, PeriodType } from "@prisma/client";
import { z } from "zod";

import { getBufferedBusyTimes } from "@calcom/core/getBusyTimes";
import dayjs, { Dayjs } from "@calcom/dayjs";
import { getWorkingHours } from "@calcom/lib/availability";
import { getDefaultEvent } from "@calcom/lib/defaultEvents";
import logger from "@calcom/lib/logger";
import { performance } from "@calcom/lib/server/perfObserver";
import getTimeSlots from "@calcom/lib/slots";
import prisma, { availabilityUserSelect } from "@calcom/prisma";
import { EventBusyDate } from "@calcom/types/Calendar";
import { TimeRange } from "@calcom/types/schedule";

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
    // Event type length
    eventTypeLength: z.number().int().optional(),
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

const checkIfIsAvailable = ({
  time,
  busy,
  eventLength,
  beforeBufferTime,
}: {
  time: Dayjs;
  busy: (TimeRange | { start: string; end: string } | EventBusyDate)[];
  eventLength: number;
  beforeBufferTime: number;
}): boolean => {
  const slotEndTime = time.add(eventLength, "minutes").utc();
  const slotStartTime = time.utc();

  return busy.every((busyTime) => {
    const startTime = dayjs.utc(busyTime.start).subtract(beforeBufferTime, "minutes").utc();
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

/** This should be called getAvailableSlots */
export const slotsRouter = createRouter().query("getSchedule", {
  input: getScheduleSchema,
  async resolve({ input, ctx }) {
    return {
      slots: await getSchedule(input, ctx),
    };
  },
});

async function getEventType(ctx: { prisma: typeof prisma }, input: z.infer<typeof getScheduleSchema>) {
  return ctx.prisma.eventType.findUnique({
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
      bookingLimits: true,
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
}

async function getDynamicEventType(ctx: { prisma: typeof prisma }, input: z.infer<typeof getScheduleSchema>) {
  // For dynamic booking, we need to get and update user credentials, schedule and availability in the eventTypeObject as they're required in the new availability logic
  const dynamicEventType = getDefaultEvent(input.eventTypeSlug);
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
  return Object.assign({}, dynamicEventType, {
    users,
  });
}

function getRegularOrDynamicEventType(
  ctx: { prisma: typeof prisma },
  input: z.infer<typeof getScheduleSchema>
) {
  const isDynamicBooking = !input.eventTypeId;
  return isDynamicBooking ? getDynamicEventType(ctx, input) : getEventType(ctx, input);
}

const getMinimumStartTime = (
  desiredStartTime: Dayjs,
  {
    periodType,
    minimumBookingNotice,
    periodStartDate,
  }: Pick<EventType, "periodType" | "periodStartDate" | "minimumBookingNotice">
) => {
  const absoluteMinimum = dayjs()
    .utcOffset(desiredStartTime.utcOffset())
    .startOf("hour")
    .add(minimumBookingNotice, "minutes");
  if (periodType === PeriodType.RANGE) {
    const minimum = dayjs(periodStartDate).utcOffset(desiredStartTime.utcOffset()).startOf("day");
    if (minimum.isAfter(absoluteMinimum)) {
      return minimum;
    }
  }
  return absoluteMinimum;
};

const getMaximumEndTime = (
  desiredEndTime: Dayjs,
  {
    periodType,
    periodDays,
    periodCountCalendarDays,
    periodEndDate,
  }: Pick<EventType, "periodType" | "periodDays" | "periodCountCalendarDays" | "periodEndDate">
) => {
  if (periodType === PeriodType.ROLLING) {
    const daysToAdd = periodDays || 0;
    return periodCountCalendarDays
      ? dayjs().utcOffset(desiredEndTime.utcOffset()).add(daysToAdd, "days").endOf("day")
      : dayjs().utcOffset(desiredEndTime.utcOffset()).businessDaysAdd(daysToAdd).endOf("day");
  }

  if (periodType === PeriodType.RANGE) {
    return dayjs(periodEndDate).utcOffset(desiredEndTime.utcOffset()).endOf("day");
  }

  return null;
};

/** This should be called getAvailableSlots */
export async function getSchedule(input: z.infer<typeof getScheduleSchema>, ctx: { prisma: typeof prisma }) {
  if (input.debug === true) {
    logger.setSettings({ minLevel: "debug" });
  }
  if (process.env.INTEGRATION_TEST_MODE === "true") {
    logger.setSettings({ minLevel: "silly" });
  }
  const startPrismaEventTypeGet = performance.now();
  const eventType = await getRegularOrDynamicEventType(ctx, input);
  const endPrismaEventTypeGet = performance.now();
  logger.debug(
    `Prisma eventType get took ${endPrismaEventTypeGet - startPrismaEventTypeGet}ms for event:${
      input.eventTypeId
    }`
  );
  if (!eventType) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  let startTime =
    input.timeZone === "Etc/GMT"
      ? dayjs.utc(input.startTime)
      : dayjs(input.startTime).utc().tz(input.timeZone);
  let endTime =
    input.timeZone === "Etc/GMT" ? dayjs.utc(input.endTime) : dayjs(input.endTime).utc().tz(input.timeZone);

  const minimumStartTime = getMinimumStartTime(startTime, {
    periodType: eventType.periodType,
    minimumBookingNotice: eventType.minimumBookingNotice,
    periodStartDate: eventType.periodStartDate,
  });
  const maximumEndTime = getMaximumEndTime(endTime, {
    periodType: eventType.periodType,
    periodDays: eventType.periodDays,
    periodCountCalendarDays: eventType.periodCountCalendarDays,
    periodEndDate: eventType.periodEndDate,
  });

  if (maximumEndTime && startTime.isAfter(maximumEndTime)) {
    return {};
  }

  if (startTime.isBefore(minimumStartTime)) {
    startTime = minimumStartTime;
  }
  if (maximumEndTime && endTime.isAfter(maximumEndTime)) {
    endTime = maximumEndTime;
  }

  if (!startTime.isValid() || !endTime.isValid()) {
    throw new TRPCError({ message: "Invalid time range given.", code: "BAD_REQUEST" });
  }

  /* We get all users working hours and busy slots */
  const usersWorkingHoursAndBusySlots = await Promise.all(
    eventType.users.map(async (currentUser) => {
      const busy = await getBufferedBusyTimes({
        credentials: currentUser.credentials,
        userId: currentUser.id,
        eventTypeId: input.eventTypeId,
        startTime: startTime.format(),
        endTime: endTime.format(),
        selectedCalendars: currentUser.selectedCalendars,
        userBufferTime: currentUser.bufferTime,
        afterEventBuffer: eventType.afterEventBuffer,
      });

      return {
        busy,
        user: currentUser,
      };
    })
  );

  // standard working hours for all users. Mo-Sa 8-20 Berlin time.
  const workingHours = getWorkingHours({}, [
    {
      days: [1, 2, 3, 4, 5, 6],
      startTime: dayjs().tz("Europe/Berlin", true).hour(8).minute(0).second(0),
      endTime: dayjs().tz("Europe/Berlin", true).hour(20).minute(0).second(0),
    },
  ]);
  const computedAvailableSlots: Record<string, Slot[]> = {};
  const needAllUsers = !eventType.schedulingType || eventType.schedulingType === SchedulingType.COLLECTIVE;

  let currentCheckedTime = startTime;
  let getSlotsTime = 0;
  let checkForAvailabilityTime = 0;
  let getSlotsCount = 0;
  let checkForAvailabilityCount = 0;

  do {
    const startGetSlots = performance.now();
    // get slots retrieves the available times for a given day
    const timeSlots = getTimeSlots({
      inviteeDate: currentCheckedTime,
      eventLength: eventType.length,
      workingHours,
      minimumBookingNotice: eventType.minimumBookingNotice,
      frequency: eventType.slotInterval || eventType.length,
    });

    const endGetSlots = performance.now();
    getSlotsTime += endGetSlots - startGetSlots;
    getSlotsCount++;

    const userIsAvailable = (user: typeof eventType.users[number], time: Dayjs) => {
      const schedule = usersWorkingHoursAndBusySlots.find((s) => s.user.id === user.id);
      if (!schedule) return false;
      const start = performance.now();
      const available = checkIfIsAvailable({
        time,
        busy: schedule.busy,
        eventLength: eventType.length,
        beforeBufferTime: eventType.beforeEventBuffer,
      });
      checkForAvailabilityTime += performance.now() - start;
      checkForAvailabilityCount++;
      return available;
    };

    const timeSlotsForDay = timeSlots.reduce((acc, time) => {
      const availableUsers = eventType.users
        .filter((user) => userIsAvailable(user, time))
        .map((user) => user.username || "");

      if (availableUsers.length === 0) {
        // don't add the slot if no users are available
        return acc;
      }

      if (needAllUsers && availableUsers.length !== eventType.users.length) {
        // don't add the slot if not all users are available and we need all users (collective)
        return acc;
      }

      acc.push({
        time: time.toISOString(),
        users: availableUsers,
      });
      return acc;
    }, [] as Slot[]);

    computedAvailableSlots[currentCheckedTime.format("YYYY-MM-DD")] = timeSlotsForDay;
    currentCheckedTime = currentCheckedTime.add(1, "day");
  } while (currentCheckedTime.isBefore(endTime));

  logger.debug(`getSlots took ${getSlotsTime}ms and executed ${getSlotsCount} times`);

  logger.debug(
    `checkForAvailability took ${checkForAvailabilityTime}ms and executed ${checkForAvailabilityCount} times`
  );

  return computedAvailableSlots;
}
