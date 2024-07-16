// eslint-disable-next-line no-restricted-imports
import { countBy } from "lodash";
import { v4 as uuid } from "uuid";
import type z from "zod";

import CrmManager from "@calcom/core/crmManager/crmManager";
import { getAggregatedAvailability } from "@calcom/core/getAggregatedAvailability";
import { getBusyTimesForLimitChecks } from "@calcom/core/getBusyTimes";
import type { CurrentSeats, IFromUser, IToUser } from "@calcom/core/getUserAvailability";
import { getUsersAvailability } from "@calcom/core/getUserAvailability";
import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { getSlugOrRequestedSlug, orgDomainConfig } from "@calcom/ee/organizations/lib/orgDomains";
import { isEventTypeLoggingEnabled } from "@calcom/features/bookings/lib/isEventTypeLoggingEnabled";
import { parseBookingLimit, parseDurationLimit } from "@calcom/lib";
import { RESERVED_SUBDOMAINS } from "@calcom/lib/constants";
import { getUTCOffsetByTimezone } from "@calcom/lib/date-fns";
import { getDefaultEvent } from "@calcom/lib/defaultEvents";
import {
  isTimeOutOfBounds,
  calculatePeriodLimits,
  isTimeViolatingFutureLimit,
} from "@calcom/lib/isOutOfBounds";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { performance } from "@calcom/lib/server/perfObserver";
import { UserRepository } from "@calcom/lib/server/repository/user";
import getSlots from "@calcom/lib/slots";
import prisma, { availabilityUserSelect } from "@calcom/prisma";
import { PeriodType, Prisma } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import { BookingStatus } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { EventTypeAppMetadataSchema } from "@calcom/prisma/zod-utils";
import type { EventBusyDate } from "@calcom/types/Calendar";

import { TRPCError } from "@trpc/server";

import type { GetScheduleOptions } from "./getSchedule.handler";
import type { TGetScheduleInputSchema } from "./getSchedule.schema";
import { handleNotificationWhenNoSlots } from "./handleNotificationWhenNoSlots";

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

  let teamId;
  let userId;
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
  const eventType = await prisma.eventType.findFirst({
    where: {
      slug: eventTypeSlug,
      ...(teamId ? { teamId } : {}),
      ...(userId ? { userId } : {}),
    },
    select: {
      id: true,
    },
  });
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

  const eventType = await prisma.eventType.findUnique({
    where: {
      id: eventTypeId,
    },
    select: {
      id: true,
      slug: true,
      minimumBookingNotice: true,
      length: true,
      offsetStart: true,
      seatsPerTimeSlot: true,
      timeZone: true,
      slotInterval: true,
      beforeEventBuffer: true,
      afterEventBuffer: true,
      bookingLimits: true,
      durationLimits: true,
      assignAllTeamMembers: true,
      schedulingType: true,
      periodType: true,
      periodStartDate: true,
      periodEndDate: true,
      onlyShowFirstAvailableSlot: true,
      periodCountCalendarDays: true,
      periodDays: true,
      metadata: true,
      schedule: {
        select: {
          id: true,
          availability: {
            select: {
              date: true,
              startTime: true,
              endTime: true,
              days: true,
            },
          },
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
              credentials: { select: credentialForCalendarServiceSelect },
              ...availabilityUserSelect,
            },
          },
        },
      },
      users: {
        select: {
          credentials: { select: credentialForCalendarServiceSelect },
          ...availabilityUserSelect,
        },
      },
    },
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
  const { where } = await UserRepository._getWhereClauseForFindingUsersByUsername({
    orgSlug: isValidOrgDomain ? currentOrgDomain : null,
    usernameList: Array.isArray(input.usernameList)
      ? input.usernameList
      : input.usernameList
      ? [input.usernameList]
      : [],
  });
  const users = await prisma.user.findMany({
    where,
    select: {
      allowDynamicBooking: true,
      ...availabilityUserSelect,
      credentials: {
        select: credentialForCalendarServiceSelect,
      },
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

export function getRegularOrDynamicEventType(
  input: TGetScheduleInputSchema,
  organizationDetails: { currentOrgDomain: string | null; isValidOrgDomain: boolean }
) {
  const isDynamicBooking = input.usernameList && input.usernameList.length > 1;
  return isDynamicBooking
    ? getDynamicEventType(input, organizationDetails)
    : getEventType(input, organizationDetails);
}

const selectSelectedSlots = Prisma.validator<Prisma.SelectedSlotsDefaultArgs>()({
  select: {
    id: true,
    slotUtcStartDate: true,
    slotUtcEndDate: true,
    userId: true,
    isSeat: true,
    eventTypeId: true,
  },
});

type SelectedSlots = Prisma.SelectedSlotsGetPayload<typeof selectSelectedSlots>;

function applyOccupiedSeatsToCurrentSeats(currentSeats: CurrentSeats, occupiedSeats: SelectedSlots[]) {
  const occupiedSeatsCount = countBy(occupiedSeats, (item) => item.slotUtcStartDate.toISOString());
  Object.keys(occupiedSeatsCount).forEach((date) => {
    currentSeats.push({
      uid: uuid(),
      startTime: dayjs(date).toDate(),
      _count: { attendees: occupiedSeatsCount[date] },
    });
  });
  return currentSeats;
}

export interface IGetAvailableSlots {
  slots: Record<
    string,
    {
      time: string;
      attendees?: number | undefined;
      bookingUid?: string | undefined;
      away?: boolean | undefined;
      fromUser?: IFromUser | undefined;
      toUser?: IToUser | undefined;
      reason?: string | undefined;
      emoji?: string | undefined;
    }[]
  >;
  teamMember?: string | undefined;
}

async function getCRMContactOwnerForRRLeadSkip(
  bookerEmail: string,
  apps?: z.infer<typeof EventTypeAppMetadataSchema>
) {
  if (!apps) return;
  const crm = await getCRMManagerWithRRLeadSkip(apps);

  if (!crm) return;

  const contact = await crm.getContacts(bookerEmail, true);
  if (contact?.length) {
    return contact[0].ownerEmail;
  }
}

async function getCRMManagerWithRRLeadSkip(apps: z.infer<typeof EventTypeAppMetadataSchema>) {
  let crmRoundRobinLeadSkip;
  for (const appKey in apps) {
    const app = apps[appKey as keyof typeof apps];
    if (
      app.enabled &&
      typeof app.appCategories === "object" &&
      app.appCategories.some((category: string) => category === "crm") &&
      app.roundRobinLeadSkip
    ) {
      crmRoundRobinLeadSkip = app;
      break;
    }
  }

  if (crmRoundRobinLeadSkip) {
    const crmCredential = await prisma.credential.findUnique({
      where: {
        id: crmRoundRobinLeadSkip.credentialId,
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });
    if (crmCredential) {
      return new CrmManager(crmCredential);
    }
  }
  return;
}

export async function getAvailableSlots({ input, ctx }: GetScheduleOptions): Promise<IGetAvailableSlots> {
  const orgDetails = input?.orgSlug
    ? {
        currentOrgDomain: input.orgSlug,
        isValidOrgDomain: !!input.orgSlug && !RESERVED_SUBDOMAINS.includes(input.orgSlug),
      }
    : orgDomainConfig(ctx?.req);

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

  const isRollingWindowPeriodType = eventType.periodType === PeriodType.ROLLING_WINDOW;
  const startTimeAsIsoString = input.startTime;
  const isStartTimeInPast = dayjs(startTimeAsIsoString).isBefore(dayjs().subtract(1, "day").startOf("day"));

  // If startTime is already sent in the past, we don't need to adjust it.
  // We assume that the client is already sending startTime as per their requirement.
  // Note: We could optimize it further to go back 1 month in past only for the 2nd month because that is what we are putting a hard limit at.
  const startTimeAdjustedForRollingWindowComputation =
    isStartTimeInPast || !isRollingWindowPeriodType
      ? startTimeAsIsoString
      : dayjs(startTimeAsIsoString).subtract(1, "month").toISOString();

  const loggerWithEventDetails = logger.getSubLogger({
    prefix: ["getAvailableSlots", `${eventType.id}:${input.usernameList}/${input.eventTypeSlug}`],
  });

  loggerWithEventDetails.debug(
    `Prisma eventType get took ${endPrismaEventTypeGet - startPrismaEventTypeGet}ms for event:${
      input.eventTypeId
    }`
  );
  const getStartTime = (startTimeInput: string, timeZone?: string) => {
    const startTimeMin = dayjs.utc().add(eventType.minimumBookingNotice || 1, "minutes");
    const startTime = timeZone === "Etc/GMT" ? dayjs.utc(startTimeInput) : dayjs(startTimeInput).tz(timeZone);

    return startTimeMin.isAfter(startTime) ? startTimeMin.tz(timeZone) : startTime;
  };

  const startTime = getStartTime(startTimeAdjustedForRollingWindowComputation, input.timeZone);
  const endTime =
    input.timeZone === "Etc/GMT" ? dayjs.utc(input.endTime) : dayjs(input.endTime).utc().tz(input.timeZone);

  if (!startTime.isValid() || !endTime.isValid()) {
    throw new TRPCError({ message: "Invalid time range given.", code: "BAD_REQUEST" });
  }
  let currentSeats: CurrentSeats | undefined;

  let teamMember: string | undefined;

  const hosts =
    eventType.hosts?.length && eventType.schedulingType
      ? eventType.hosts
      : eventType.users.map((user) => {
          return {
            isFixed: !eventType.schedulingType || eventType.schedulingType === SchedulingType.COLLECTIVE,
            user: user,
          };
        });

  let usersWithCredentials = hosts.map(({ isFixed, user }) => ({ isFixed, ...user }));

  if (eventType.schedulingType === SchedulingType.ROUND_ROBIN && input.bookerEmail) {
    const crmContactOwner = await getCRMContactOwnerForRRLeadSkip(
      input.bookerEmail,
      eventType?.metadata?.apps
    );
    const contactOwnerHost = hosts.find((host) => host.user.email === crmContactOwner);

    if (contactOwnerHost) {
      teamMember = contactOwnerHost.user.email;
      const contactOwnerIsRRHost = !contactOwnerHost.isFixed;

      usersWithCredentials = usersWithCredentials.filter(
        (user) => user.email !== contactOwnerHost.user.email && (!contactOwnerIsRRHost || user.isFixed)
      );
      usersWithCredentials.push({ ...contactOwnerHost.user, isFixed: true });
    }
  }

  const durationToUse = input.duration || 0;

  const startTimeDate =
    input.rescheduleUid && durationToUse
      ? startTime.subtract(durationToUse, "minute").toDate()
      : startTime.toDate();

  const endTimeDate =
    input.rescheduleUid && durationToUse ? endTime.add(durationToUse, "minute").toDate() : endTime.toDate();

  const sharedQuery = {
    startTime: { lte: endTimeDate },
    endTime: { gte: startTimeDate },
    status: {
      in: [BookingStatus.ACCEPTED],
    },
  };

  const allUserIds = usersWithCredentials.map((user) => user.id);

  const currentBookingsAllUsers = await prisma.booking.findMany({
    where: {
      OR: [
        // User is primary host (individual events, or primary organizer)
        {
          ...sharedQuery,
          userId: {
            in: allUserIds,
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
          onlyShowFirstAvailableSlot: true,
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

  const bookingLimits = parseBookingLimit(eventType?.bookingLimits);
  const durationLimits = parseDurationLimit(eventType?.durationLimits);
  let busyTimesFromLimitsBookingsAllUsers: Awaited<ReturnType<typeof getBusyTimesForLimitChecks>> = [];

  if (eventType && (bookingLimits || durationLimits)) {
    busyTimesFromLimitsBookingsAllUsers = await getBusyTimesForLimitChecks({
      userIds: allUserIds,
      eventTypeId: eventType.id,
      startDate: startTime.format(),
      endDate: endTime.format(),
      rescheduleUid: input.rescheduleUid,
      bookingLimits,
      durationLimits,
    });
  }

  const users = usersWithCredentials.map((currentUser) => {
    return {
      ...currentUser,
      currentBookings: currentBookingsAllUsers
        .filter((b) => b.userId === currentUser.id || b.attendees?.some((a) => a.email === currentUser.email))
        .map((bookings) => {
          const { attendees: _attendees, ...bookingWithoutAttendees } = bookings;
          return bookingWithoutAttendees;
        }),
    };
  });

  /* We get all users working hours and busy slots */
  const allUsersAvailability = (
    await getUsersAvailability({
      users,
      query: {
        dateFrom: startTime.format(),
        dateTo: endTime.format(),
        eventTypeId: eventType.id,
        afterEventBuffer: eventType.afterEventBuffer,
        beforeEventBuffer: eventType.beforeEventBuffer,
        duration: input.duration || 0,
        returnDateOverrides: false,
      },
      initialData: {
        eventType,
        currentSeats,
        rescheduleUid: input.rescheduleUid,
        busyTimesFromLimitsBookings: busyTimesFromLimitsBookingsAllUsers,
      },
    })
  ).map(
    (
      { busy, dateRanges, oooExcludedDateRanges, currentSeats: _currentSeats, timeZone, datesOutOfOffice },
      index
    ) => {
      const currentUser = users[index];
      if (!currentSeats && _currentSeats) currentSeats = _currentSeats;
      return {
        timeZone,
        dateRanges,
        oooExcludedDateRanges,
        busy,
        user: currentUser,
        datesOutOfOffice,
      };
    }
  );

  const availabilityCheckProps = {
    eventLength: input.duration || eventType.length,
    currentSeats,
  };

  const getSlotsTime = 0;
  const checkForAvailabilityTime = 0;
  const getSlotsCount = 0;
  const checkForAvailabilityCount = 0;
  const aggregatedAvailability = getAggregatedAvailability(allUsersAvailability, eventType.schedulingType);

  const isTeamEvent =
    eventType.schedulingType === SchedulingType.COLLECTIVE ||
    eventType.schedulingType === SchedulingType.ROUND_ROBIN ||
    allUsersAvailability.length > 1;

  const timeSlots = getSlots({
    inviteeDate: startTime,
    eventLength: input.duration || eventType.length,
    offsetStart: eventType.offsetStart,
    dateRanges: aggregatedAvailability,
    minimumBookingNotice: eventType.minimumBookingNotice,
    frequency: eventType.slotInterval || input.duration || eventType.length,
    organizerTimeZone:
      eventType.timeZone || eventType?.schedule?.timeZone || allUsersAvailability?.[0]?.timeZone,
    datesOutOfOffice: !isTeamEvent ? allUsersAvailability[0]?.datesOutOfOffice : undefined,
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
      ...selectSelectedSlots,
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
      if (typeof availabilityCheckProps.currentSeats !== "undefined") {
        availabilityCheckProps.currentSeats = availabilityCheckProps.currentSeats.map((item) => {
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
        });
        occupiedSeats = occupiedSeats.filter(
          (item) => !addedToCurrentSeats.includes(item.slotUtcStartDate.toISOString())
        );
      }

      availabilityCheckProps.currentSeats = applyOccupiedSeatsToCurrentSeats(
        availabilityCheckProps.currentSeats || [],
        occupiedSeats
      );

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

  // fr-CA uses YYYY-MM-DD
  const formatter = new Intl.DateTimeFormat("fr-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: input.timeZone,
  });

  const slotsMappedToDate = availableTimeSlots.reduce(
    (
      r: Record<string, { time: string; attendees?: number; bookingUid?: string }[]>,
      { time, ...passThroughProps }
    ) => {
      // TODO: Adds unit tests to prevent regressions in getSchedule (try multiple timezones)

      // This used to be _time.tz(input.timeZone) but Dayjs tz() is slow.
      // toLocaleDateString slugish, using Intl.DateTimeFormat we get the desired speed results.
      const dateString = formatter.format(time.toDate());

      r[dateString] = r[dateString] || [];
      if (eventType.onlyShowFirstAvailableSlot && r[dateString].length > 0) {
        return r;
      }
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

  loggerWithEventDetails.debug(safeStringify({ slotsMappedToDate }));

  const availableDates = Object.keys(slotsMappedToDate);
  const allDatesWithBookabilityStatus = getAllDatesWithBookabilityStatus(availableDates);
  loggerWithEventDetails.debug(safeStringify({ availableDates }));

  const utcOffset = input.timeZone ? getUTCOffsetByTimezone(input.timeZone) ?? 0 : 0;
  const periodLimits = calculatePeriodLimits({
    periodType: eventType.periodType,
    periodDays: eventType.periodDays,
    periodCountCalendarDays: eventType.periodCountCalendarDays,
    periodStartDate: eventType.periodStartDate,
    periodEndDate: eventType.periodEndDate,
    allDatesWithBookabilityStatus,
    utcOffset,
  });
  let foundAFutureLimitViolation = false;
  const withinBoundsSlotsMappedToDate = Object.entries(slotsMappedToDate).reduce(
    (withinBoundsSlotsMappedToDate, [date, slots]) => {
      // Computation Optimization: If a future limit violation has been found, we just consider all slots to be out of bounds beyond that slot.
      // We can't do the same for periodType=RANGE because it can start from a day other than today and today will hit the violation then.
      if (foundAFutureLimitViolation && doesRangeStartFromToday(eventType.periodType)) {
        return withinBoundsSlotsMappedToDate;
      }
      const filteredSlots = slots.filter((slot) => {
        const isFutureLimitViolationForTheSlot = isTimeViolatingFutureLimit({
          time: slot.time,
          periodLimits,
        });
        if (isFutureLimitViolationForTheSlot) {
          foundAFutureLimitViolation = true;
        }
        return (
          !isFutureLimitViolationForTheSlot &&
          // TODO: Perf Optmization: Slots calculation logic already seems to consider the minimum booking notice and past booking time and thus there shouldn't be need to filter out slots here.
          !isTimeOutOfBounds({ time: slot.time, minimumBookingNotice: eventType.minimumBookingNotice })
        );
      });

      if (!filteredSlots.length) {
        // If there are no slots available, we don't set that date, otherwise having an empty slots array makes frontend consider it as an all day OOO case
        return withinBoundsSlotsMappedToDate;
      }

      withinBoundsSlotsMappedToDate[date] = filteredSlots;
      return withinBoundsSlotsMappedToDate;
    },
    {} as typeof slotsMappedToDate
  );

  loggerWithEventDetails.debug(`getSlots took ${getSlotsTime}ms and executed ${getSlotsCount} times`);

  loggerWithEventDetails.debug(
    `checkForAvailability took ${checkForAvailabilityTime}ms and executed ${checkForAvailabilityCount} times`
  );
  loggerWithEventDetails.debug(`Available slots: ${JSON.stringify(withinBoundsSlotsMappedToDate)}`);

  // We only want to run this on single targeted events and not dynamic
  if (!Object.keys(withinBoundsSlotsMappedToDate).length && input.usernameList?.length === 1) {
    try {
      await handleNotificationWhenNoSlots({
        eventDetails: {
          username: input.usernameList?.[0],
          startTime: startTime,
          eventSlug: eventType.slug,
        },
        orgDetails,
      });
    } catch (e) {
      loggerWithEventDetails.error(
        `Something has went wrong. Upstash could be down and we have caught the error to not block availability:
 ${e}`
      );
    }
  }

  return {
    slots: withinBoundsSlotsMappedToDate,
    teamMember,
  };
}

function doesRangeStartFromToday(periodType: PeriodType) {
  return periodType === PeriodType.ROLLING_WINDOW || periodType === PeriodType.ROLLING;
}

async function getUserIdFromUsername(
  username: string,
  organizationDetails: { currentOrgDomain: string | null; isValidOrgDomain: boolean }
) {
  const { currentOrgDomain, isValidOrgDomain } = organizationDetails;

  const [user] = await UserRepository.findUsersByUsername({
    usernameList: [username],
    orgSlug: isValidOrgDomain ? currentOrgDomain : null,
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

export function getAllDatesWithBookabilityStatus(availableDates: string[]) {
  const availableDatesSet = new Set(availableDates);
  const firstDate = dayjs(availableDates[0]);
  const lastDate = dayjs(availableDates[availableDates.length - 1]);
  const allDates: Record<string, { isBookable: boolean }> = {};

  let currentDate = firstDate;
  while (currentDate <= lastDate) {
    allDates[currentDate.format("YYYY-MM-DD")] = {
      isBookable: availableDatesSet.has(currentDate.format("YYYY-MM-DD")),
    };

    currentDate = currentDate.add(1, "day");
  }
  return allDates;
}
