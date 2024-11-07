import type {
  Booking,
  Prisma,
  OutOfOfficeEntry,
  OutOfOfficeReason,
  User,
  EventType as PrismaEventType,
} from "@prisma/client";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { parseBookingLimit, parseDurationLimit } from "@calcom/lib";
import { getWorkingHours } from "@calcom/lib/availability";
import type { DateOverride, WorkingHours } from "@calcom/lib/date-ranges";
import { buildDateRanges, subtract } from "@calcom/lib/date-ranges";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma, { availabilityUserSelect } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import { BookingStatus } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import { EventTypeMetaDataSchema, stringToDayjsZod } from "@calcom/prisma/zod-utils";
import type { EventBusyDetails, IntervalLimitUnit } from "@calcom/types/Calendar";
import type { TimeRange } from "@calcom/types/schedule";

import { getBusyTimesFromLimits, getBusyTimesFromTeamLimits } from "./bookingLimits/getBusyTimesFromLimits";
import { getBusyTimes } from "./getBusyTimes";
import monitorCallbackAsync, { monitorCallbackSync } from "./sentryWrapper";

const log = logger.getSubLogger({ prefix: ["getUserAvailability"] });
const availabilitySchema = z
  .object({
    dateFrom: stringToDayjsZod,
    dateTo: stringToDayjsZod,
    eventTypeId: z.number().optional(),
    username: z.string().optional(),
    userId: z.number().optional(),
    afterEventBuffer: z.number().optional(),
    beforeEventBuffer: z.number().optional(),
    duration: z.number().optional(),
    withSource: z.boolean().optional(),
    returnDateOverrides: z.boolean(),
    bypassBusyCalendarTimes: z.boolean().optional(),
  })
  .refine((data) => !!data.username || !!data.userId, "Either username or userId should be filled in.");

const getEventType = async (
  ...args: Parameters<typeof _getEventType>
): Promise<ReturnType<typeof _getEventType>> => {
  return monitorCallbackAsync(_getEventType, ...args);
};

const _getEventType = async (id: number) => {
  const eventType = await prisma.eventType.findUnique({
    where: { id },
    select: {
      id: true,
      seatsPerTimeSlot: true,
      bookingLimits: true,
      parent: {
        select: {
          team: {
            select: {
              id: true,
              bookingLimits: true,
              includeManagedEventsInLimits: true,
            },
          },
        },
      },
      team: {
        select: {
          id: true,
          bookingLimits: true,
          includeManagedEventsInLimits: true,
        },
      },
      hosts: {
        select: {
          user: {
            select: {
              email: true,
              id: true,
            },
          },
          schedule: {
            select: {
              availability: {
                select: {
                  date: true,
                  startTime: true,
                  endTime: true,
                  days: true,
                },
              },
              timeZone: true,
              id: true,
            },
          },
        },
      },
      durationLimits: true,
      assignAllTeamMembers: true,
      schedulingType: true,
      timeZone: true,
      length: true,
      metadata: true,
      schedule: {
        select: {
          id: true,
          availability: {
            select: {
              days: true,
              date: true,
              startTime: true,
              endTime: true,
            },
          },
          timeZone: true,
        },
      },
      availability: {
        select: {
          startTime: true,
          endTime: true,
          days: true,
          date: true,
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
};

export type EventType = Awaited<ReturnType<typeof getEventType>>;

const getUser = async (...args: Parameters<typeof _getUser>): Promise<ReturnType<typeof _getUser>> => {
  return monitorCallbackAsync(_getUser, ...args);
};

const _getUser = async (where: Prisma.UserWhereInput) => {
  return await prisma.user.findFirst({
    where,
    select: {
      ...availabilityUserSelect,
      credentials: {
        select: credentialForCalendarServiceSelect,
      },
    },
  });
};

type GetUser = Awaited<ReturnType<typeof getUser>>;

export const getCurrentSeats = async (
  ...args: Parameters<typeof _getCurrentSeats>
): Promise<ReturnType<typeof _getCurrentSeats>> => {
  return monitorCallbackAsync(_getCurrentSeats, ...args);
};

const _getCurrentSeats = async (
  eventType: {
    id?: number;
    schedulingType?: SchedulingType | null;
    hosts?: {
      user: {
        email: string;
      };
    }[];
  },
  dateFrom: Dayjs,
  dateTo: Dayjs
) => {
  const { schedulingType, hosts, id } = eventType;
  const hostEmails = hosts?.map((host) => host.user.email);
  const isTeamEvent =
    schedulingType === SchedulingType.MANAGED ||
    schedulingType === SchedulingType.ROUND_ROBIN ||
    schedulingType === SchedulingType.COLLECTIVE;

  const bookings = await prisma.booking.findMany({
    where: {
      eventTypeId: id,
      startTime: {
        gte: dateFrom.format(),
        lte: dateTo.format(),
      },
      status: BookingStatus.ACCEPTED,
    },
    select: {
      uid: true,
      startTime: true,
      attendees: {
        select: {
          email: true,
        },
      },
    },
  });

  return bookings.map((booking) => {
    const attendees = isTeamEvent
      ? booking.attendees.filter((attendee) => !hostEmails?.includes(attendee.email))
      : booking.attendees;

    return {
      uid: booking.uid,
      startTime: booking.startTime,
      _count: {
        attendees: attendees.length,
      },
    };
  });
};

export type CurrentSeats = Awaited<ReturnType<typeof getCurrentSeats>>;

export const getUserAvailability = async (
  ...args: Parameters<typeof _getUserAvailability>
): Promise<ReturnType<typeof _getUserAvailability>> => {
  return monitorCallbackAsync(_getUserAvailability, ...args);
};

/** This should be called getUsersWorkingHoursAndBusySlots (...and remaining seats, and final timezone) */
const _getUserAvailability = async function getUsersWorkingHoursLifeTheUniverseAndEverythingElse(
  query: {
    withSource?: boolean;
    username?: string;
    userId?: number;
    dateFrom: string;
    dateTo: string;
    eventTypeId?: number;
    afterEventBuffer?: number;
    beforeEventBuffer?: number;
    duration?: number;
    returnDateOverrides: boolean;
    bypassBusyCalendarTimes: boolean;
  },
  initialData?: {
    user?: GetUser;
    eventType?: EventType;
    currentSeats?: CurrentSeats;
    rescheduleUid?: string | null;
    currentBookings?: (Pick<Booking, "id" | "uid" | "userId" | "startTime" | "endTime" | "title"> & {
      eventType: Pick<
        PrismaEventType,
        "id" | "beforeEventBuffer" | "afterEventBuffer" | "seatsPerTimeSlot"
      > | null;
      _count?: {
        seatsReferences: number;
      };
    })[];
    outOfOfficeDays?: (Pick<OutOfOfficeEntry, "id" | "start" | "end"> & {
      user: Pick<User, "id" | "name">;
      toUser: Pick<User, "id" | "username" | "name"> | null;
      reason: Pick<OutOfOfficeReason, "id" | "emoji" | "reason"> | null;
    })[];
    busyTimesFromLimitsBookings: EventBusyDetails[];
  }
) {
  const {
    username,
    userId,
    dateFrom,
    dateTo,
    eventTypeId,
    afterEventBuffer,
    beforeEventBuffer,
    duration,
    returnDateOverrides,
    bypassBusyCalendarTimes = false,
  } = availabilitySchema.parse(query);

  if (!dateFrom.isValid() || !dateTo.isValid()) {
    throw new HttpError({ statusCode: 400, message: "Invalid time range given." });
  }

  const where: Prisma.UserWhereInput = {};
  if (username) where.username = username;
  if (userId) where.id = userId;

  const user = initialData?.user || (await getUser(where));

  if (!user) throw new HttpError({ statusCode: 404, message: "No user found in getUserAvailability" });
  log.debug(
    "getUserAvailability for user",
    safeStringify({ user: { id: user.id }, slot: { dateFrom, dateTo } })
  );

  let eventType: EventType | null = initialData?.eventType || null;
  if (!eventType && eventTypeId) eventType = await getEventType(eventTypeId);

  /* Current logic is if a booking is in a time slot mark it as busy, but seats can have more than one attendee so grab
    current bookings with a seats event type and display them on the calendar, even if they are full */
  let currentSeats: CurrentSeats | null = initialData?.currentSeats || null;
  if (!currentSeats && eventType?.seatsPerTimeSlot) {
    currentSeats = await getCurrentSeats(eventType, dateFrom, dateTo);
  }

  const userSchedule = user.schedules.filter(
    (schedule) => !user?.defaultScheduleId || schedule.id === user?.defaultScheduleId
  )[0];

  const hostSchedule = eventType?.hosts?.find((host) => host.user.id === user.id)?.schedule;

  // TODO: It uses default timezone of user. Should we use timezone of team ?
  const fallbackTimezoneIfScheduleIsMissing = eventType?.timeZone || user.timeZone;

  const fallbackSchedule = {
    availability: [
      {
        startTime: new Date("1970-01-01T09:00:00Z"),
        endTime: new Date("1970-01-01T17:00:00Z"),
        days: [1, 2, 3, 4, 5], // Monday to Friday
        date: null,
      },
    ],
    id: 0,

    timeZone: fallbackTimezoneIfScheduleIsMissing,
  };

  const schedule =
    (eventType?.schedule ? eventType.schedule : hostSchedule ? hostSchedule : userSchedule) ??
    fallbackSchedule;
  const timeZone = schedule?.timeZone || fallbackTimezoneIfScheduleIsMissing;

  const bookingLimits = parseBookingLimit(eventType?.bookingLimits);
  const durationLimits = parseDurationLimit(eventType?.durationLimits);

  const busyTimesFromLimits =
    eventType && (bookingLimits || durationLimits)
      ? await getBusyTimesFromLimits(
          bookingLimits,
          durationLimits,
          dateFrom.tz(timeZone),
          dateTo.tz(timeZone),
          duration,
          eventType,
          initialData?.busyTimesFromLimitsBookings ?? [],
          timeZone,
          initialData?.rescheduleUid ?? undefined
        )
      : [];

  const teamForBookingLimits =
    eventType?.team ??
    (eventType?.parent?.team?.includeManagedEventsInLimits ? eventType?.parent?.team : null);

  const teamBookingLimits = parseBookingLimit(teamForBookingLimits?.bookingLimits);

  const busyTimesFromTeamLimits =
    teamForBookingLimits && teamBookingLimits
      ? await getBusyTimesFromTeamLimits(
          user,
          teamBookingLimits,
          dateFrom.tz(timeZone),
          dateTo.tz(timeZone),
          teamForBookingLimits.id,
          teamForBookingLimits.includeManagedEventsInLimits,
          timeZone,
          initialData?.rescheduleUid ?? undefined
        )
      : [];

  // TODO: only query what we need after applying limits (shrink date range)
  const getBusyTimesStart = dateFrom.toISOString();
  const getBusyTimesEnd = dateTo.toISOString();

  const busyTimes = await monitorCallbackAsync(getBusyTimes, {
    credentials: user.credentials,
    startTime: getBusyTimesStart,
    endTime: getBusyTimesEnd,
    eventTypeId,
    userId: user.id,
    userEmail: user.email,
    username: `${user.username}`,
    beforeEventBuffer,
    afterEventBuffer,
    selectedCalendars: user.selectedCalendars,
    seatedEvent: !!eventType?.seatsPerTimeSlot,
    rescheduleUid: initialData?.rescheduleUid || null,
    duration,
    currentBookings: initialData?.currentBookings,
    bypassBusyCalendarTimes,
  });

  const detailedBusyTimes: EventBusyDetails[] = [
    ...busyTimes.map((a) => ({
      ...a,
      start: dayjs(a.start).toISOString(),
      end: dayjs(a.end).toISOString(),
      title: a.title,
      source: query.withSource ? a.source : undefined,
    })),
    ...busyTimesFromLimits,
    ...busyTimesFromTeamLimits,
  ];

  const isDefaultSchedule = userSchedule && userSchedule.id === schedule?.id;

  log.debug(
    "Using schedule:",
    safeStringify({
      chosenSchedule: schedule,
      eventTypeSchedule: eventType?.schedule,
      userSchedule: userSchedule,
      hostSchedule: hostSchedule,
    })
  );

  if (
    !(schedule?.availability || (eventType?.availability.length ? eventType.availability : user.availability))
  ) {
    throw new HttpError({ statusCode: 400, message: ErrorCode.AvailabilityNotFoundInSchedule });
  }

  const availability = (
    schedule?.availability || (eventType?.availability.length ? eventType.availability : user.availability)
  ).map((a) => ({
    ...a,
    userId: user.id,
  }));

  const workingHours = getWorkingHours({ timeZone }, availability);

  const dateOverrides: TimeRange[] = [];
  // NOTE: getSchedule is currently calling this function for every user in a team event
  // but not using these values at all, wasting CPU. Adding this check here temporarily to avoid a larger refactor
  // since other callers do using this data.
  if (returnDateOverrides) {
    const calculateDateOverridesSpan = Sentry.startInactiveSpan({ name: "calculateDateOverrides" });
    const availabilityWithDates = availability.filter((availability) => !!availability.date);

    for (let i = 0; i < availabilityWithDates.length; i++) {
      const override = availabilityWithDates[i];
      const startTime = dayjs.utc(override.startTime);
      const endTime = dayjs.utc(override.endTime);
      const overrideStartDate = dayjs.utc(override.date).hour(startTime.hour()).minute(startTime.minute());
      const overrideEndDate = dayjs.utc(override.date).hour(endTime.hour()).minute(endTime.minute());
      if (
        overrideStartDate.isBetween(dateFrom, dateTo, null, "[]") ||
        overrideEndDate.isBetween(dateFrom, dateTo, null, "[]")
      ) {
        dateOverrides.push({
          start: overrideStartDate.toDate(),
          end: overrideEndDate.toDate(),
        });
      }
    }

    calculateDateOverridesSpan.end();
  }

  const outOfOfficeDays =
    initialData?.outOfOfficeDays ??
    (await prisma.outOfOfficeEntry.findMany({
      where: {
        userId: user.id,
        OR: [
          // outside of range
          // (start <= 'dateTo' AND end >= 'dateFrom')
          {
            start: {
              lte: dateTo.toISOString(),
            },
            end: {
              gte: dateFrom.toISOString(),
            },
          },
          // start is between dateFrom and dateTo but end is outside of range
          // (start <= 'dateTo' AND end >= 'dateTo')
          {
            start: {
              lte: dateTo.toISOString(),
            },

            end: {
              gte: dateTo.toISOString(),
            },
          },
          // end is between dateFrom and dateTo but start is outside of range
          // (start <= 'dateFrom' OR end <= 'dateTo')
          {
            start: {
              lte: dateFrom.toISOString(),
            },

            end: {
              lte: dateTo.toISOString(),
            },
          },
        ],
      },
      select: {
        id: true,
        start: true,
        end: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        toUser: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        reason: {
          select: {
            id: true,
            emoji: true,
            reason: true,
          },
        },
      },
    }));

  const datesOutOfOffice: IOutOfOfficeData = calculateOutOfOfficeRanges(outOfOfficeDays, availability);

  const { dateRanges, oooExcludedDateRanges } = buildDateRanges({
    dateFrom,
    dateTo,
    availability,
    timeZone,
    travelSchedules: isDefaultSchedule
      ? user.travelSchedules.map((schedule) => {
          return {
            startDate: dayjs(schedule.startDate),
            endDate: schedule.endDate ? dayjs(schedule.endDate) : undefined,
            timeZone: schedule.timeZone,
          };
        })
      : [],
    outOfOffice: datesOutOfOffice,
  });

  const formattedBusyTimes = detailedBusyTimes.map((busy) => ({
    start: dayjs(busy.start),
    end: dayjs(busy.end),
  }));

  const dateRangesInWhichUserIsAvailable = subtract(dateRanges, formattedBusyTimes);
  const dateRangesInWhichUserIsAvailableWithoutOOO = subtract(oooExcludedDateRanges, formattedBusyTimes);

  return {
    busy: detailedBusyTimes,
    timeZone,
    dateRanges: dateRangesInWhichUserIsAvailable,
    oooExcludedDateRanges: dateRangesInWhichUserIsAvailableWithoutOOO,
    workingHours,
    dateOverrides,
    currentSeats,
    datesOutOfOffice,
  };
};

export const getPeriodStartDatesBetween = (
  ...args: Parameters<typeof _getPeriodStartDatesBetween>
): ReturnType<typeof _getPeriodStartDatesBetween> => {
  return monitorCallbackSync(_getPeriodStartDatesBetween, ...args);
};

const _getPeriodStartDatesBetween = (dateFrom: Dayjs, dateTo: Dayjs, period: IntervalLimitUnit) => {
  const dates = [];
  let startDate = dayjs(dateFrom).startOf(period);
  const endDate = dayjs(dateTo).endOf(period);

  while (startDate.isBefore(endDate)) {
    dates.push(startDate);
    startDate = startDate.add(1, period);
  }
  return dates;
};

interface GetUserAvailabilityParamsDTO {
  availability: (DateOverride | WorkingHours)[];
}

export interface IFromUser {
  id: number;
  displayName: string | null;
}

export interface IToUser {
  id: number;
  username: string | null;
  displayName: string | null;
}

export interface IOutOfOfficeData {
  [key: string]: {
    fromUser: IFromUser | null;
    toUser?: IToUser | null;
    reason?: string | null;
    emoji?: string | null;
  };
}

const calculateOutOfOfficeRanges = (
  outOfOfficeDays: GetUserAvailabilityInitialData["outOfOfficeDays"],
  availability: GetUserAvailabilityParamsDTO["availability"]
): IOutOfOfficeData => {
  if (!outOfOfficeDays || outOfOfficeDays.length === 0) {
    return {};
  }

  return outOfOfficeDays.reduce((acc: IOutOfOfficeData, { start, end, toUser, user, reason }) => {
    // here we should use startDate or today if start is before today
    // consider timezone in start and end date range
    const startDateRange = dayjs(start).utc().isBefore(dayjs().startOf("day").utc())
      ? dayjs().utc().startOf("day")
      : dayjs(start).utc().startOf("day");

    // get number of day in the week and see if it's on the availability
    const flattenDays = Array.from(new Set(availability.flatMap((a) => ("days" in a ? a.days : [])))).sort(
      (a, b) => a - b
    );

    const endDateRange = dayjs(end).utc().endOf("day");

    for (let date = startDateRange; date.isBefore(endDateRange); date = date.add(1, "day")) {
      const dayNumberOnWeek = date.day();

      if (!flattenDays?.includes(dayNumberOnWeek)) {
        continue; // Skip to the next iteration if day not found in flattenDays
      }

      acc[date.format("YYYY-MM-DD")] = {
        // @TODO:  would be good having start and end availability time here, but for now should be good
        // you can obtain that from user availability defined outside of here
        fromUser: { id: user.id, displayName: user.name },
        // optional chaining destructuring toUser
        toUser: !!toUser ? { id: toUser.id, displayName: toUser.name, username: toUser.username } : null,
        reason: !!reason ? reason.reason : null,
        emoji: !!reason ? reason.emoji : null,
      };
    }

    return acc;
  }, {});
};

type GetUserAvailabilityQuery = Parameters<typeof getUserAvailability>[0];
type GetUserAvailabilityInitialData = NonNullable<Parameters<typeof getUserAvailability>[1]>;
export type GetAvailabilityUser = NonNullable<GetUserAvailabilityInitialData["user"]>;

const _getUsersAvailability = async ({
  users,
  query,
  initialData,
}: {
  users: (GetAvailabilityUser & {
    currentBookings?: GetUserAvailabilityInitialData["currentBookings"];
    outOfOfficeDays?: GetUserAvailabilityInitialData["outOfOfficeDays"];
  })[];
  query: Omit<GetUserAvailabilityQuery, "userId" | "username">;
  initialData?: Omit<GetUserAvailabilityInitialData, "user">;
}) => {
  return await Promise.all(
    users.map((user) =>
      _getUserAvailability(
        {
          ...query,
          userId: user.id,
          username: user.username || "",
        },
        initialData
          ? {
              ...initialData,
              user,
              currentBookings: user.currentBookings,
              outOfOfficeDays: user.outOfOfficeDays,
            }
          : undefined
      )
    )
  );
};

export const getUsersAvailability = async (
  ...args: Parameters<typeof _getUsersAvailability>
): Promise<ReturnType<typeof _getUsersAvailability>> => {
  return monitorCallbackAsync(_getUsersAvailability, ...args);
};
