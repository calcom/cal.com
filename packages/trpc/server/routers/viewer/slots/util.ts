import { countBy } from "lodash";
import { v4 as uuid } from "uuid";

import { getAggregateWorkingHours } from "@calcom/core/getAggregateWorkingHours";
import type { CurrentSeats } from "@calcom/core/getUserAvailability";
import { getUserAvailability } from "@calcom/core/getUserAvailability";
import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { getDefaultEvent } from "@calcom/lib/defaultEvents";
import isTimeOutOfBounds from "@calcom/lib/isOutOfBounds";
import logger from "@calcom/lib/logger";
import { performance } from "@calcom/lib/server/perfObserver";
import getTimeSlots from "@calcom/lib/slots";
import { availabilityUserSelect } from "@calcom/prisma";
import prisma from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { EventBusyDate } from "@calcom/types/Calendar";

import { TRPCError } from "@trpc/server";

import type { TGetScheduleInputSchema } from "./getSchedule.schema";

export const checkIfIsAvailable = ({
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

export async function getEventType(input: TGetScheduleInputSchema) {
  const eventType = await prisma.eventType.findUnique({
    where: {
      id: input.eventTypeId,
    },
    select: {
      id: true,
      slug: true,
      minimumBookingNotice: true,
      length: true,
      seatsPerTimeSlot: true,
      timeZone: true,
      slotInterval: true,
      beforeEventBuffer: true,
      afterEventBuffer: true,
      bookingLimits: true,
      durationLimits: true,
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
            select: {
              credentials: true, // Don't leak credentials to the client
              ...availabilityUserSelect,
            },
          },
        },
      },
      users: {
        select: {
          credentials: true, // Don't leak credentials to the client
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

export async function getDynamicEventType(input: TGetScheduleInputSchema) {
  // For dynamic booking, we need to get and update user credentials, schedule and availability in the eventTypeObject as they're required in the new availability logic
  const dynamicEventType = getDefaultEvent(input.eventTypeSlug);
  const users = await prisma.user.findMany({
    where: {
      username: {
        in: input.usernameList,
      },
    },
    select: {
      allowDynamicBooking: true,
      credentials: true, // Don't leak credentials to the client
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

export function getRegularOrDynamicEventType(input: TGetScheduleInputSchema) {
  const isDynamicBooking = !input.eventTypeId;
  return isDynamicBooking ? getDynamicEventType(input) : getEventType(input);
}

/** This should be called getAvailableSlots */
export async function getSchedule(input: TGetScheduleInputSchema) {
  if (input.debug === true) {
    logger.setSettings({ minLevel: "debug" });
  }
  if (process.env.INTEGRATION_TEST_MODE === "true") {
    logger.setSettings({ minLevel: "silly" });
  }
  const startPrismaEventTypeGet = performance.now();
  const eventType = await getRegularOrDynamicEventType(input);
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
  let currentSeats: CurrentSeats | undefined;

  let usersWithCredentials = eventType.users.map((user) => ({
    isFixed: !eventType.schedulingType || eventType.schedulingType === SchedulingType.COLLECTIVE,
    ...user,
  }));
  // overwrite if it is a team event & hosts is set, otherwise keep using users.
  if (eventType.schedulingType && !!eventType.hosts?.length) {
    usersWithCredentials = eventType.hosts.map(({ isFixed, user }) => ({ isFixed, ...user }));
  }
  /* We get all users working hours and busy slots */
  const userAvailability = await Promise.all(
    usersWithCredentials.map(async (currentUser) => {
      const {
        busy,
        workingHours,
        dateOverrides,
        currentSeats: _currentSeats,
        timeZone,
      } = await getUserAvailability(
        {
          userId: currentUser.id,
          username: currentUser.username || "",
          dateFrom: startTime.format(),
          dateTo: endTime.format(),
          eventTypeId: input.eventTypeId,
          afterEventBuffer: eventType.afterEventBuffer,
          beforeEventBuffer: eventType.beforeEventBuffer,
          duration: input.duration || 0,
        },
        { user: currentUser, eventType, currentSeats }
      );
      if (!currentSeats && _currentSeats) currentSeats = _currentSeats;

      return {
        timeZone,
        workingHours,
        dateOverrides,
        busy,
        user: currentUser,
      };
    })
  );
  // flattens availability of multiple users
  const dateOverrides = userAvailability.flatMap((availability) =>
    availability.dateOverrides.map((override) => ({ userId: availability.user.id, ...override }))
  );
  const workingHours = getAggregateWorkingHours(userAvailability, eventType.schedulingType);
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

  const getSlotsTime = 0;
  let checkForAvailabilityTime = 0;
  const getSlotsCount = 0;
  let checkForAvailabilityCount = 0;

  const timeSlots: ReturnType<typeof getTimeSlots> = [];

  for (
    let currentCheckedTime = startTime;
    currentCheckedTime.isBefore(endTime);
    currentCheckedTime = currentCheckedTime.add(1, "day")
  ) {
    // get slots retrieves the available times for a given day
    timeSlots.push(
      ...getTimeSlots({
        inviteeDate: currentCheckedTime,
        eventLength: input.duration || eventType.length,
        workingHours,
        dateOverrides,
        minimumBookingNotice: eventType.minimumBookingNotice,
        frequency: eventType.slotInterval || input.duration || eventType.length,
        organizerTimeZone:
          eventType.timeZone || eventType?.schedule?.timeZone || userAvailability?.[0]?.timeZone,
      })
    );
  }

  let availableTimeSlots: typeof timeSlots = [];
  // Load cached busy slots
  const selectedSlots =
    /* FIXME: For some reason this returns undefined while testing in Jest */
    (await prisma.selectedSlots.findMany({
      where: {
        userId: { in: usersWithCredentials.map((user) => user.id) },
        releaseAt: { gt: dayjs.utc().format() },
      },
      select: {
        id: true,
        slotUtcStartDate: true,
        slotUtcEndDate: true,
        userId: true,
        isSeat: true,
        eventTypeId: true,
      },
    })) || [];
  await prisma.selectedSlots.deleteMany({
    where: { eventTypeId: { equals: eventType.id }, id: { notIn: selectedSlots.map((item) => item.id) } },
  });

  availableTimeSlots = timeSlots.filter((slot) => {
    const fixedHosts = userAvailability.filter((availability) => availability.user.isFixed);
    return fixedHosts.every((schedule) => {
      const startCheckForAvailability = performance.now();

      const isAvailable = checkIfIsAvailable({
        time: slot.time,
        ...schedule,
        ...availabilityCheckProps,
      });
      const endCheckForAvailability = performance.now();
      checkForAvailabilityCount++;
      checkForAvailabilityTime += endCheckForAvailability - startCheckForAvailability;
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

  if (selectedSlots?.length > 0) {
    let occupiedSeats: typeof selectedSlots = selectedSlots.filter(
      (item) => item.isSeat && item.eventTypeId === eventType.id
    );
    if (occupiedSeats?.length) {
      const addedToCurrentSeats: string[] = [];
      if (typeof availabilityCheckProps.currentSeats !== undefined) {
        availabilityCheckProps.currentSeats = (availabilityCheckProps.currentSeats as CurrentSeats).map(
          (item) => {
            const attendees =
              occupiedSeats.filter(
                (seat) => seat.slotUtcStartDate.toISOString() === item.startTime.toISOString()
              )?.length || 0;
            if (attendees) addedToCurrentSeats.push(item.startTime.toISOString());
            return {
              ...item,
              _count: {
                attendees: item._count.attendees + attendees,
              },
            };
          }
        ) as CurrentSeats;
        occupiedSeats = occupiedSeats.filter(
          (item) => !addedToCurrentSeats.includes(item.slotUtcStartDate.toISOString())
        );
      }

      if (occupiedSeats?.length && typeof availabilityCheckProps.currentSeats === undefined)
        availabilityCheckProps.currentSeats = [];
      const occupiedSeatsCount = countBy(occupiedSeats, (item) => item.slotUtcStartDate.toISOString());
      Object.keys(occupiedSeatsCount).forEach((date) => {
        (availabilityCheckProps.currentSeats as CurrentSeats).push({
          uid: uuid(),
          startTime: dayjs(date).toDate(),
          _count: { attendees: occupiedSeatsCount[date] },
        });
      });
      currentSeats = availabilityCheckProps.currentSeats;
    }

    availableTimeSlots = availableTimeSlots
      .map((slot) => {
        slot.userIds = slot.userIds?.filter((slotUserId) => {
          const busy = selectedSlots.reduce<EventBusyDate[]>((r, c) => {
            if (c.userId === slotUserId && !c.isSeat) {
              r.push({ start: c.slotUtcStartDate, end: c.slotUtcEndDate });
            }
            return r;
          }, []);

          if (!busy?.length && eventType.seatsPerTimeSlot === null) {
            return false;
          }

          return checkIfIsAvailable({
            time: slot.time,
            busy,
            ...availabilityCheckProps,
          });
        });
        return slot;
      })
      .filter((slot) => !!slot.userIds?.length);
  }

  availableTimeSlots = availableTimeSlots.filter((slot) => isTimeWithinBounds(slot.time));

  const computedAvailableSlots = availableTimeSlots.reduce(
    (
      r: Record<string, { time: string; users: string[]; attendees?: number; bookingUid?: string }[]>,
      { time: _time, ...passThroughProps }
    ) => {
      // TODO: Adds unit tests to prevent regressions in getSchedule (try multiple timezones)
      const time = _time.tz(input.timeZone);

      r[time.format("YYYY-MM-DD")] = r[time.format("YYYY-MM-DD")] || [];
      r[time.format("YYYY-MM-DD")].push({
        ...passThroughProps,
        time: time.toISOString(),
        users: (eventType.hosts
          ? eventType.hosts.map((hostUserWithCredentials) => {
              const { user } = hostUserWithCredentials;
              const { credentials: _credentials, ...hostUser } = user;
              return hostUser;
            })
          : eventType.users
        ).map((user) => user.username || ""),
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
      });
      return r;
    },
    Object.create(null)
  );

  logger.debug(`getSlots took ${getSlotsTime}ms and executed ${getSlotsCount} times`);

  logger.debug(
    `checkForAvailability took ${checkForAvailabilityTime}ms and executed ${checkForAvailabilityCount} times`
  );
  logger.silly(`Available slots: ${JSON.stringify(computedAvailableSlots)}`);

  return {
    slots: computedAvailableSlots,
  };
}
