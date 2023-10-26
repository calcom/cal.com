import { jsonObjectFrom, jsonArrayFrom } from "kysely/helpers/postgres";
// eslint-disable-next-line no-restricted-imports
import { countBy } from "lodash";
import { v4 as uuid } from "uuid";

import { getAggregatedAvailability } from "@calcom/core/getAggregatedAvailability";
import type { CurrentSeats } from "@calcom/core/getUserAvailability";
import { getUserAvailability } from "@calcom/core/getUserAvailability";
import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { getSlugOrRequestedSlug, orgDomainConfig } from "@calcom/ee/organizations/lib/orgDomains";
import { isEventTypeLoggingEnabled } from "@calcom/features/bookings/lib/isEventTypeLoggingEnabled";
import db from "@calcom/kysely";
import { getDefaultEvent } from "@calcom/lib/defaultEvents";
import isTimeOutOfBounds from "@calcom/lib/isOutOfBounds";
import logger from "@calcom/lib/logger";
import { performance } from "@calcom/lib/server/perfObserver";
import getSlots from "@calcom/lib/slots";
import prisma from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import { BookingStatus } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { EventBusyDate } from "@calcom/types/Calendar";

import { TRPCError } from "@trpc/server";

import type { GetScheduleOptions } from "./getSchedule.handler";
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

async function getEventTypeId({
  slug,
  eventTypeSlug,
  isTeamEvent,
  organizationDetails,
}: {
  slug?: string;
  eventTypeSlug?: string;
  isTeamEvent: boolean;
  organizationDetails?: { currentOrgDomain: string | null; isValidOrgDomain: boolean };
}) {
  if (!eventTypeSlug || !slug) return null;

  let teamId: number | undefined;
  let userId: number | undefined;

  if (isTeamEvent) {
    teamId = await getTeamIdFromSlug(
      slug,
      organizationDetails ?? { currentOrgDomain: null, isValidOrgDomain: false }
    );
  } else {
    userId = await getUserIdFromUsername(
      slug,
      organizationDetails ?? { currentOrgDomain: null, isValidOrgDomain: false }
    );
  }

  const eventType = await db
    .selectFrom("EventType")
    .where((eb) =>
      eb.and({
        slug: eventTypeSlug,
        ...(teamId ? { teamId } : {}),
        ...(userId ? { userId } : {}),
      })
    )
    .select("id")
    .executeTakeFirst();

  if (!eventType) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  return eventType?.id;
}

export async function getEventType(
  input: TGetScheduleInputSchema,
  organizationDetails: { currentOrgDomain: string | null; isValidOrgDomain: boolean }
) {
  const { eventTypeSlug, usernameList, isTeamEvent } = input;
  const eventTypeId =
    input.eventTypeId ||
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    (await getEventTypeId({
      slug: usernameList?.[0],
      eventTypeSlug: eventTypeSlug,
      isTeamEvent,
      organizationDetails,
    }));

  if (!eventTypeId) {
    return null;
  }

  const eventType = await db
    .selectFrom("EventType")
    .where("id", "=", eventTypeId)
    .select((eb) => [
      "EventType.id",
      "EventType.slug",
      "EventType.minimumBookingNotice",
      "EventType.length",
      "EventType.offsetStart",
      "EventType.seatsPerTimeSlot",
      "EventType.timeZone",
      "EventType.slotInterval",
      "EventType.beforeEventBuffer",
      "EventType.afterEventBuffer",
      "EventType.bookingLimits",
      "EventType.durationLimits",
      "EventType.schedulingType",
      "EventType.periodType",
      "EventType.periodStartDate",
      "EventType.periodEndDate",
      "EventType.periodCountCalendarDays",
      "EventType.periodDays",
      "EventType.metadata",
      jsonObjectFrom(
        eb
          .selectFrom("Schedule")
          .whereRef("Schedule.id", "=", "EventType.scheduleId")
          .select((eb) => [
            "Schedule.timeZone",
            jsonArrayFrom(
              eb
                .selectFrom("Availability")
                .whereRef("Availability.scheduleId", "=", "Schedule.id")
                .select(["date", "startTime", "endTime", "days"])
            ).as("availability"),
          ])
      ).as("schedule"),
      jsonArrayFrom(
        eb
          .selectFrom("Availability")
          .whereRef("Availability.eventTypeId", "=", "EventType.id")
          .select(["date", "startTime", "endTime", "days"])
      ).as("availability"),
      jsonArrayFrom(
        eb
          .selectFrom("Host")
          .leftJoin("users", "users.id", "Host.userId")
          .leftJoin("Credential", "Credential.userId", "users.id")
          .whereRef("Host.eventTypeId", "=", "EventType.id")
          .select((eb) => [
            "isFixed",
            jsonObjectFrom(
              eb
                .selectFrom("users")
                .whereRef("users.id", "=", "Host.userId")
                .select((eb) => [
                  jsonArrayFrom(
                    eb
                      .selectFrom("Credential")
                      .whereRef("Credential.userId", "=", "users.id")
                      .select([
                        "id",
                        "appId",
                        "type",
                        "userId",
                        "teamId",
                        "key",
                        "invalid",
                        jsonObjectFrom(
                          eb
                            .selectFrom("users")
                            .whereRef("users.id", "=", "Credential.userId")
                            .select("email")
                        ).as("user"),
                      ])
                  ).as("credentials"),
                  "id",
                  "timeZone",
                  "email",
                  "bufferTime",
                  "startTime",
                  "username",
                  "endTime",
                  "timeFormat",
                  "defaultScheduleId",
                  jsonArrayFrom(
                    eb
                      .selectFrom("Schedule")
                      .whereRef("Schedule.userId", "=", "users.id")
                      .select((eb) => [
                        "id",
                        "timeZone",
                        jsonArrayFrom(
                          eb
                            .selectFrom("Availability")
                            .select(["date", "startTime", "endTime", "days"])
                            .whereRef("Availability.scheduleId", "=", "Schedule.id")
                        ).as("availability"),
                      ])
                  ).as("schedules"),
                  jsonArrayFrom(
                    eb.selectFrom("Availability").selectAll().whereRef("Availability.userId", "=", "users.id")
                  ).as("availability"),
                  jsonArrayFrom(
                    eb
                      .selectFrom("SelectedCalendar")
                      .selectAll()
                      .whereRef("SelectedCalendar.userId", "=", "users.id")
                  ).as("selectedCalendars"),
                ])
            ).as("user"),
          ])
      ).as("hosts"),
      jsonArrayFrom(
        eb
          .selectFrom("_user_eventtype")
          .leftJoin("users", "users.id", "_user_eventtype.B")
          .whereRef("_user_eventtype.A", "=", "EventType.id")
          .leftJoin("Credential", "Credential.userId", "users.id")
          .select((eb) => [
            jsonArrayFrom(
              eb
                .selectFrom("Credential")
                .whereRef("Credential.userId", "=", "users.id")
                .select([
                  "id",
                  "appId",
                  "type",
                  "userId",
                  "teamId",
                  "key",
                  "invalid",
                  jsonObjectFrom(
                    eb.selectFrom("users").whereRef("users.id", "=", "Credential.userId").select("email")
                  ).as("user"),
                ])
            ).as("credentials"),
            "users.id",
            "users.timeZone",
            "users.email",
            "users.bufferTime",
            "users.startTime",
            "users.username",
            "users.endTime",
            "users.timeFormat",
            "users.defaultScheduleId",
            jsonArrayFrom(
              eb
                .selectFrom("Schedule")
                .whereRef("Schedule.userId", "=", "users.id")
                .select((eb) => [
                  "id",
                  "timeZone",
                  jsonArrayFrom(
                    eb
                      .selectFrom("Availability")
                      .select(["date", "startTime", "endTime", "days"])
                      .whereRef("Availability.scheduleId", "=", "Schedule.id")
                  ).as("availability"),
                ])
            ).as("schedules"),
            jsonArrayFrom(
              eb.selectFrom("Availability").selectAll().whereRef("Availability.userId", "=", "users.id")
            ).as("availability"),
            jsonArrayFrom(
              eb
                .selectFrom("SelectedCalendar")
                .selectAll()
                .whereRef("SelectedCalendar.userId", "=", "users.id")
            ).as("selectedCalendars"),
          ])
      ).as("users"),
    ])
    .executeTakeFirst();

  // note(Lauris): Availability startTime and endTime have DateTime in Prisma schema,
  // but in DB only hh:mm:ss are stored e.g. "09:00:00". Prisma transforms data as follows:
  eventType?.users.forEach((user) => {
    user.schedules.forEach((schedule) => {
      schedule.availability.forEach((availability) => {
        availability.startTime = new Date(`1970-01-01T${availability.startTime}.000Z`);
        availability.endTime = new Date(`1970-01-01T${availability.endTime}.000Z`);
      });
    });
  });

  if (!eventType) {
    return null;
  }

  return {
    ...eventType,
    metadata: EventTypeMetaDataSchema.parse(eventType.metadata),
  };
}

export async function getDynamicEventType(
  input: TGetScheduleInputSchema,
  organizationDetails: { currentOrgDomain: string | null; isValidOrgDomain: boolean }
) {
  const { currentOrgDomain, isValidOrgDomain } = organizationDetails;
  // For dynamic booking, we need to get and update user credentials, schedule and availability in the eventTypeObject as they're required in the new availability logic
  if (!input.eventTypeSlug) {
    throw new TRPCError({
      message: "eventTypeSlug is required for dynamic booking",
      code: "BAD_REQUEST",
    });
  }
  const dynamicEventType = getDefaultEvent(input.eventTypeSlug);

  const usernameList = Array.isArray(input.usernameList)
    ? input.usernameList
    : input.usernameList
    ? [input.usernameList]
    : [];

  const slugifiedValue = slugify(currentOrgDomain);

  const users = await db
    .selectFrom("user")
    .innerJoin("organization as org", "org.id", "user.organizationId")
    .where((eb) =>
      eb.and([
        usernameList.length > 0 ? eb("username", "in", usernameList) : undefined,
        isValidOrgDomain && currentOrgDomain
          ? eb.or([
              eb("org.slug", "=", slugifiedValue),
              eb.raw(`metadata->>'requestedSlug' = ?`, slugifiedValue),
            ])
          : undefined,
      ])
    )
    .select((eb) => [
      "allowDynamicBooking",
      "id",
      "timeZone",
      "email",
      "bufferTime",
      "startTime",
      "username",
      "endTime",
      "timeFormat",
      "defaultScheduleId",
      jsonArrayFrom(
        eb
          .selectFrom("Schedule")
          .whereRef("Schedule.userId", "=", "users.id")
          .select((eb) => [
            "id",
            "timeZone",
            jsonArrayFrom(
              eb
                .selectFrom("Availability")
                .select(["date", "startTime", "endTime", "days"])
                .whereRef("Availability.scheduleId", "=", "Schedule.id")
            ).as("availability"),
          ])
      ).as("schedules"),
      jsonArrayFrom(
        eb.selectFrom("Availability").selectAll().whereRef("Availability.userId", "=", "users.id")
      ).as("availability"),
      jsonArrayFrom(
        eb.selectFrom("SelectedCalendar").selectAll().whereRef("SelectedCalendar.userId", "=", "users.id")
      ).as("selectedCalendars"),
      jsonArrayFrom(
        eb
          .selectFrom("Credential")
          .whereRef("Credential.userId", "=", "users.id")
          .select([
            "id",
            "appId",
            "type",
            "userId",
            "teamId",
            "key",
            "invalid",
            jsonObjectFrom(
              eb.selectFrom("users").whereRef("users.id", "=", "Credential.userId").select("email")
            ).as("user"),
          ])
      ).as("credentials"),
    ])
    .execute();

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

export function getRegularOrDynamicEventType(
  input: TGetScheduleInputSchema,
  organizationDetails: { currentOrgDomain: string | null; isValidOrgDomain: boolean }
) {
  const isDynamicBooking = input.usernameList && input.usernameList.length > 1;
  return isDynamicBooking
    ? getDynamicEventType(input, organizationDetails)
    : getEventType(input, organizationDetails);
}

export async function getAvailableSlots({ input, ctx }: GetScheduleOptions) {
  const orgDetails = orgDomainConfig(ctx?.req?.headers.host ?? "");
  if (process.env.INTEGRATION_TEST_MODE === "true") {
    logger.settings.minLevel = 2;
  }
  const startPrismaEventTypeGet = performance.now();
  const eventType = await getRegularOrDynamicEventType(input, orgDetails);
  const endPrismaEventTypeGet = performance.now();

  if (!eventType) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  if (isEventTypeLoggingEnabled({ eventTypeId: eventType.id })) {
    logger.settings.minLevel = 2;
  }

  const loggerWithEventDetails = logger.getSubLogger({
    prefix: ["getAvailableSlots", `${eventType.id}:${input.usernameList}/${input.eventTypeSlug}`],
  });

  loggerWithEventDetails.debug(
    `Prisma eventType get took ${endPrismaEventTypeGet - startPrismaEventTypeGet}ms for event:${
      input.eventTypeId
    }`
  );
  const getStartTime = (startTimeInput: string, timeZone?: string) => {
    const startTimeMin = dayjs.utc().add(eventType.minimumBookingNotice, "minutes");
    const startTime = timeZone === "Etc/GMT" ? dayjs.utc(startTimeInput) : dayjs(startTimeInput).tz(timeZone);

    return startTimeMin.isAfter(startTime) ? startTimeMin.tz(timeZone) : startTime;
  };

  const startTime = getStartTime(input.startTime, input.timeZone);
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

  const durationToUse = input.duration || 0;

  const startTimeDate =
    input.rescheduleUid && durationToUse
      ? startTime.subtract(durationToUse, "minute").toDate()
      : startTime.toDate();

  const endTimeDate =
    input.rescheduleUid && durationToUse ? endTime.add(durationToUse, "minute").toDate() : endTime.toDate();

  const sharedQuery = {
    startTime: { gte: startTimeDate },
    endTime: { lte: endTimeDate },
    status: {
      in: [BookingStatus.ACCEPTED],
    },
  };

  const currentBookingsAllUsers = await prisma.booking.findMany({
    where: {
      OR: [
        // User is primary host (individual events, or primary organizer)
        {
          ...sharedQuery,
          userId: {
            in: usersWithCredentials.map((user) => user.id),
          },
        },
        // The current user has a different booking at this time he/she attends
        {
          ...sharedQuery,
          attendees: {
            some: {
              email: {
                in: usersWithCredentials.map((user) => user.email),
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      uid: true,
      userId: true,
      startTime: true,
      endTime: true,
      title: true,
      attendees: true,
      eventType: {
        select: {
          id: true,
          afterEventBuffer: true,
          beforeEventBuffer: true,
          seatsPerTimeSlot: true,
        },
      },
      ...(!!eventType?.seatsPerTimeSlot && {
        _count: {
          select: {
            seatsReferences: true,
          },
        },
      }),
    },
  });

  /* We get all users working hours and busy slots */
  const userAvailability = await Promise.all(
    usersWithCredentials.map(async (currentUser) => {
      const {
        busy,
        dateRanges,
        currentSeats: _currentSeats,
        timeZone,
      } = await getUserAvailability(
        {
          userId: currentUser.id,
          username: currentUser.username || "",
          dateFrom: startTime.format(),
          dateTo: endTime.format(),
          eventTypeId: eventType.id,
          afterEventBuffer: eventType.afterEventBuffer,
          beforeEventBuffer: eventType.beforeEventBuffer,
          duration: input.duration || 0,
        },
        {
          user: currentUser,
          eventType,
          currentSeats,
          rescheduleUid: input.rescheduleUid,
          currentBookings: currentBookingsAllUsers
            .filter(
              (b) => b.userId === currentUser.id || b.attendees?.some((a) => a.email === currentUser.email)
            )
            .map((bookings) => {
              const { attendees: _attendees, ...bookingWithoutAttendees } = bookings;
              return bookingWithoutAttendees;
            }),
        }
      );
      if (!currentSeats && _currentSeats) currentSeats = _currentSeats;
      return {
        timeZone,
        dateRanges,
        busy,
        user: currentUser,
      };
    })
  );

  const availabilityCheckProps = {
    eventLength: input.duration || eventType.length,
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
  const checkForAvailabilityTime = 0;
  const getSlotsCount = 0;
  const checkForAvailabilityCount = 0;

  const timeSlots = getSlots({
    inviteeDate: startTime,
    eventLength: input.duration || eventType.length,
    offsetStart: eventType.offsetStart,
    dateRanges: getAggregatedAvailability(userAvailability, eventType.schedulingType),
    minimumBookingNotice: eventType.minimumBookingNotice,
    frequency: eventType.slotInterval || input.duration || eventType.length,
    organizerTimeZone: eventType.timeZone || eventType?.schedule?.timeZone || userAvailability?.[0]?.timeZone,
  });

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

  availableTimeSlots = timeSlots;

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
        const busy = selectedSlots.reduce<EventBusyDate[]>((r, c) => {
          if (!c.isSeat) {
            r.push({ start: c.slotUtcStartDate, end: c.slotUtcEndDate });
          }
          return r;
        }, []);

        if (
          checkIfIsAvailable({
            time: slot.time,
            busy,
            ...availabilityCheckProps,
          })
        ) {
          return slot;
        }
        return undefined;
      })
      .filter(
        (
          item:
            | {
                time: dayjs.Dayjs;
                userIds?: number[] | undefined;
              }
            | undefined
        ): item is {
          time: dayjs.Dayjs;
          userIds?: number[] | undefined;
        } => {
          return !!item;
        }
      );
  }

  availableTimeSlots = availableTimeSlots.filter((slot) => isTimeWithinBounds(slot.time));
  // fr-CA uses YYYY-MM-DD
  const formatter = new Intl.DateTimeFormat("fr-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: input.timeZone,
  });

  const computedAvailableSlots = availableTimeSlots.reduce(
    (
      r: Record<string, { time: string; attendees?: number; bookingUid?: string }[]>,
      { time, ...passThroughProps }
    ) => {
      // TODO: Adds unit tests to prevent regressions in getSchedule (try multiple timezones)

      // This used to be _time.tz(input.timeZone) but Dayjs tz() is slow.
      // toLocaleDateString slugish, using Intl.DateTimeFormat we get the desired speed results.
      const dateString = formatter.format(time.toDate());

      r[dateString] = r[dateString] || [];
      r[dateString].push({
        ...passThroughProps,
        time: time.toISOString(),
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

  loggerWithEventDetails.debug(`getSlots took ${getSlotsTime}ms and executed ${getSlotsCount} times`);

  loggerWithEventDetails.debug(
    `checkForAvailability took ${checkForAvailabilityTime}ms and executed ${checkForAvailabilityCount} times`
  );
  loggerWithEventDetails.debug(`Available slots: ${JSON.stringify(computedAvailableSlots)}`);

  return {
    slots: computedAvailableSlots,
  };
}

async function getUserIdFromUsername(
  username: string,
  organizationDetails: { currentOrgDomain: string | null; isValidOrgDomain: boolean }
) {
  const { currentOrgDomain, isValidOrgDomain } = organizationDetails;
  const user = await prisma.user.findFirst({
    where: {
      username,
      organization: isValidOrgDomain && currentOrgDomain ? getSlugOrRequestedSlug(currentOrgDomain) : null,
    },
    select: {
      id: true,
    },
  });
  return user?.id;
}

async function getTeamIdFromSlug(
  slug: string,
  organizationDetails: { currentOrgDomain: string | null; isValidOrgDomain: boolean }
) {
  const { currentOrgDomain, isValidOrgDomain } = organizationDetails;
  const team = await prisma.team.findFirst({
    where: {
      slug,
      parent: isValidOrgDomain && currentOrgDomain ? getSlugOrRequestedSlug(currentOrgDomain) : null,
    },
    select: {
      id: true,
    },
  });
  return team?.id;
}
