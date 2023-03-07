import { SchedulingType } from "@prisma/client";
import { z } from "zod";

import type { CurrentSeats } from "@calcom/core/getUserAvailability";
import { getUserAvailability } from "@calcom/core/getUserAvailability";
import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { getDefaultEvent } from "@calcom/lib/defaultEvents";
import isTimeOutOfBounds from "@calcom/lib/isOutOfBounds";
import logger from "@calcom/lib/logger";
import { performance } from "@calcom/lib/server/perfObserver";
import getSlots from "@calcom/lib/slots";
import type prisma from "@calcom/prisma";
import { availabilityUserSelect } from "@calcom/prisma";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { EventBusyDate } from "@calcom/types/Calendar";

import { TRPCError } from "@trpc/server";

import { router, publicProcedure } from "../../trpc";

const getScheduleSchema = z
  .object({
    // startTime ISOString
    startTime: z
      .string()
      .datetime()
      .transform((dateString) => new Date(dateString)),
    // endTime ISOString
    endTime: z
      .string()
      .datetime()
      .transform((dateString) => new Date(dateString)),
    // Event type ID
    eventTypeId: z.number().int().optional(),
    // Event type slug
    eventTypeSlug: z.string(),
    // or list of users (for dynamic events)
    usernameList: z.array(z.string()).optional(),
    debug: z.boolean().optional(),
    // to handle event types with multiple duration options
    duration: z
      .string()
      .optional()
      .transform((val) => val && parseInt(val)),
  })
  .refine(
    (data) => !!data.eventTypeId || !!data.usernameList,
    "Either usernameList or eventTypeId should be filled in."
  );

export type Slot = {
  time: string;
  userIds?: number[];
  attendees?: number;
  bookingUid?: string;
  users?: string[];
};

const checkIfIsAvailable = ({
  time,
  busy,
  eventLength,
  currentSeats,
}: {
  time: Dayjs;
  busy: EventBusyDate[];
  eventLength: number;
  currentSeats?: CurrentSeats;
}): boolean => {
  if (currentSeats?.some((booking) => booking.startTime.toISOString() === time.toISOString())) {
    return true;
  }

  const slotEndTime = time.add(eventLength, "minutes").utc();
  const slotStartTime = time.utc();

  return busy.every((busyTime) => {
    const startTime = dayjs.utc(busyTime.start).utc();
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
export const slotsRouter = router({
  getSchedule: publicProcedure.input(getScheduleSchema).query(async ({ input, ctx }) => {
    return await getSchedule(input, ctx);
  }),
});

async function getEventType(ctx: { prisma: typeof prisma }, input: z.infer<typeof getScheduleSchema>) {
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
      bookingLimits: true,
      schedulingType: true,
      periodType: true,
      periodStartDate: true,
      periodEndDate: true,
      periodCountCalendarDays: true,
      periodDays: true,
      metadata: true,
      schedule: {
        select: {
          availability: true,
          timeZone: true,
        },
      },
      availability: {
        select: {
          date: true,
          startTime: true,
          endTime: true,
          days: true,
        },
      },
      hosts: {
        select: {
          isFixed: true,
          user: {
            select: availabilityUserSelect,
          },
        },
      },
      users: {
        select: {
          ...availabilityUserSelect,
        },
      },
    },
  });
  if (!eventType) {
    return eventType;
  }

  return {
    ...eventType,
    metadata: EventTypeMetaDataSchema.parse(eventType.metadata),
  };
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

  let currentSeats: CurrentSeats | undefined = undefined;

  let users = eventType.users.map((user) => ({
    isFixed: !eventType.schedulingType || eventType.schedulingType === SchedulingType.COLLECTIVE,
    ...user,
  }));
  // overwrite if it is a team event & hosts is set, otherwise keep using users.
  if (eventType.schedulingType && !!eventType.hosts?.length) {
    users = eventType.hosts.map(({ isFixed, user }) => ({ isFixed, ...user }));
  }
  /* We get all users working hours and busy slots */
  const userAvailability = await Promise.all(
    users.map(async (currentUser) => {
      const {
        busy,
        availability,
        currentSeats: _currentSeats,
        timeZone,
      } = await getUserAvailability(
        {
          userId: currentUser.id,
          username: currentUser.username || "",
          dateFrom: input.startTime.toISOString(),
          dateTo: input.endTime.toISOString(),
          eventTypeId: input.eventTypeId,
          afterEventBuffer: eventType.afterEventBuffer,
          beforeEventBuffer: eventType.beforeEventBuffer,
        },
        { user: currentUser, eventType, currentSeats }
      );
      if (!currentSeats && _currentSeats) currentSeats = _currentSeats;

      return {
        timeZone,
        availability,
        busy,
        user: currentUser,
      };
    })
  );

  const availabilityCheckProps = {
    eventLength: eventType.length,
    currentSeats,
  };

  const isTimeWithinBounds = (_time: Parameters<typeof isTimeOutOfBounds>[0]) =>
    !isTimeOutOfBounds(_time, {
      periodType: eventType.periodType,
      periodStartDate: eventType.periodStartDate,
      periodEndDate: eventType.periodEndDate,
      periodCountCalendarDays: eventType.periodCountCalendarDays,
      periodDays: eventType.periodDays,
    });

  const timeSlots = getSlots({
    eventLength: input.duration || eventType.length,
    availability: userAvailability.map((item) => item.availability).flat(),
    frequency: eventType.slotInterval || input.duration || eventType.length,
  });

  let availableTimeSlots: typeof timeSlots = [];
  availableTimeSlots = timeSlots.filter((slot) => {
    const fixedHosts = userAvailability.filter((availability) => availability.user.isFixed);
    return fixedHosts.every((schedule) => {
      const isAvailable = checkIfIsAvailable({
        time: slot.time,
        ...schedule,
        ...availabilityCheckProps,
      });
      return isAvailable;
    });
  });
  // what else are you going to call it?
  const looseHostAvailability = userAvailability.filter(({ user: { isFixed } }) => !isFixed);
  if (looseHostAvailability.length > 0) {
    availableTimeSlots = availableTimeSlots
      .map((slot) => {
        slot.userIds = slot.userIds?.filter((slotUserId) => {
          const userSchedule = looseHostAvailability.find(
            ({ user: { id: userId } }) => userId === slotUserId
          );
          if (!userSchedule) {
            return false;
          }
          return checkIfIsAvailable({
            time: slot.time,
            ...userSchedule,
            ...availabilityCheckProps,
          });
        });
        return slot;
      })
      .filter((slot) => !!slot.userIds?.length);
  }

  const slotsWithMetadata = availableTimeSlots.map((slot) => {
    const { time, ...passThrough } = slot;
    return {
      ...passThrough,
      time: time.toISOString(),
      users: (eventType.hosts ? eventType.hosts.map((host) => host.user) : eventType.users).map(
        (user) => user.username || ""
      ),
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
    };
  });

  return {
    slots: slotsWithMetadata,
  };
}
