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
import { getWorkingHours } from "@calcom/lib/availability";
import type { DateOverride, WorkingHours } from "@calcom/lib/date-ranges";
import { buildDateRanges, subtract } from "@calcom/lib/date-ranges";
import { stringToDayjsZod } from "@calcom/lib/dayjs";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { HttpError } from "@calcom/lib/http-error";
import { parseBookingLimit } from "@calcom/lib/intervalLimits/isBookingLimits";
import { parseDurationLimit } from "@calcom/lib/intervalLimits/isDurationLimits";
import {
  getBusyTimesFromLimits,
  getBusyTimesFromTeamLimits,
} from "@calcom/lib/intervalLimits/server/getBusyTimesFromLimits";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { findUsersForAvailabilityCheck } from "@calcom/lib/server/findUsersForAvailabilityCheck";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import { EventTypeRepository } from "@calcom/lib/server/repository/eventTypeRepository";
import { PrismaOOORepository } from "@calcom/lib/server/repository/ooo";
import type { UserRepository } from "@calcom/lib/server/repository/user";
import prisma from "@calcom/prisma";
import type { SchedulingType } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { EventBusyDetails, IntervalLimitUnit } from "@calcom/types/Calendar";
import type { TimeRange } from "@calcom/types/schedule";

import { getBusyTimes } from "./getBusyTimes";
import { withReporting } from "./sentryWrapper";

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
    shouldServeCache: z.boolean().optional(),
  })
  .refine((data) => !!data.username || !!data.userId, "Either username or userId should be filled in.");

const _getEventType = async (id: number) => {
  const eventType = await prisma.eventType.findUnique({
    where: { id },
    select: {
      id: true,
      seatsPerTimeSlot: true,
      bookingLimits: true,
      useEventLevelSelectedCalendars: true,
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

export type EventType = NonNullable<Awaited<ReturnType<typeof _getEventType>>>;

export const getEventType = withReporting(_getEventType, "getEventType");

export interface UserAvailabilityDependencies {
  getEventType: (id: number) => Promise<EventType | null>;
  getCurrentSeats: (eventType: any, dateFrom: Dayjs, dateTo: Dayjs) => Promise<CurrentSeats>;
  getOutOfOfficeDays: (userId: number, dateFrom: Dayjs, dateTo: Dayjs) => Promise<any>;
}

export type GetUserAvailabilityInput = {
  dateFrom: string;
  dateTo: string;
  eventTypeId?: number;
  username?: string;
  userId?: number;
  afterEventBuffer?: number;
  beforeEventBuffer?: number;
  withSource?: boolean;
  duration?: number;
  returnDateOverrides?: boolean;
  bypassBusyCalendarTimes?: boolean;
  shouldServeCache?: boolean;
};

const _getUser = async (where: Prisma.UserWhereInput) => {
  return findUsersForAvailabilityCheck({ where });
};

type GetUser = Awaited<ReturnType<typeof _getUser>>;

const getUser = withReporting(_getUser, "getUser");

export type GetUserAvailabilityInitialData = {
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
  busyTimesFromLimits?: Map<number, EventBusyDetails[]>;
  eventTypeForLimits?: {
    id: number;
    bookingLimits?: unknown;
    durationLimits?: unknown;
  } | null;
  teamBookingLimits?: Map<number, EventBusyDetails[]>;
  teamForBookingLimits?: {
    id: number;
    bookingLimits?: unknown;
    includeManagedEventsInLimits: boolean;
  } | null;
};

export type GetAvailabilityUser = NonNullable<GetUserAvailabilityInitialData["user"]>;

export type CurrentSeats = {
  uid: string;
  startTime: Date;
  _count: {
    attendees: number;
  };
}[];

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
): Promise<CurrentSeats> => {
  const bookingRepo = new BookingRepository(prisma);
  return await bookingRepo.findCurrentSeats({
    eventType,
    dateFrom: dateFrom.format(),
    dateTo: dateTo.format(),
  });
};

export const getCurrentSeats = withReporting(_getCurrentSeats, "getCurrentSeats");

const _getOutOfOfficeDaysDefault = async (userId: number, dateFrom: Dayjs, dateTo: Dayjs) => {
  const oooRepo = new PrismaOOORepository(prisma);
  const oooEntries = await oooRepo.findManyOOO({
    startTimeDate: dateFrom.toDate(),
    endTimeDate: dateTo.toDate(),
    allUserIds: [userId],
  });

  return oooEntries.map((entry) => ({
    id: entry.id,
    start: entry.start,
    end: entry.end,
    user: entry.user,
    toUser: entry.toUser,
    reason: entry.reason,
  }));
};

/** This should be called getUsersWorkingHoursAndBusySlots (...and remaining seats, and final timezone) */
export const _getUserAvailability = async function getUsersWorkingHoursLifeTheUniverseAndEverythingElse(
  query: z.infer<typeof availabilitySchema>,
  initialData?: GetUserAvailabilityInitialData,
  dependencies?: UserAvailabilityDependencies
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
    shouldServeCache,
  } = availabilitySchema.parse(query);

  log.debug(
    `EventType: ${eventTypeId} | User: ${username} (ID: ${userId}) - Called with: ${safeStringify({
      query,
    })}`
  );

  if (!dateFrom.isValid() || !dateTo.isValid()) {
    throw new HttpError({ statusCode: 400, message: "Invalid time range given." });
  }

  const where: Prisma.UserWhereInput = {};
  if (username) where.username = username;
  if (userId) where.id = userId;

  const user = initialData?.user || (await getUser(where));

  if (!user) {
    throw new HttpError({ statusCode: 404, message: "No user found in getUserAvailability" });
  }

  let eventType: EventType | null = initialData?.eventType || null;
  if (!eventType && eventTypeId) {
    eventType = dependencies ? await dependencies.getEventType(eventTypeId) : await getEventType(eventTypeId);
  }

  /* Current logic is if a booking is in a time slot mark it as busy, but seats can have more than one attendee so grab
    current bookings with a seats event type and display them on the calendar, even if they are full */
  let currentSeats: CurrentSeats | null = initialData?.currentSeats || null;
  if (!currentSeats && eventType?.seatsPerTimeSlot) {
    currentSeats = dependencies
      ? await dependencies.getCurrentSeats(eventType, dateFrom, dateTo)
      : await getCurrentSeats(eventType, dateFrom, dateTo);
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

  const bookingLimits =
    eventType?.bookingLimits &&
    typeof eventType.bookingLimits === "object" &&
    Object.keys(eventType.bookingLimits).length > 0
      ? parseBookingLimit(eventType.bookingLimits)
      : null;

  const durationLimits =
    eventType?.durationLimits &&
    typeof eventType.durationLimits === "object" &&
    Object.keys(eventType.durationLimits).length > 0
      ? parseDurationLimit(eventType.durationLimits)
      : null;

  let busyTimesFromLimits: EventBusyDetails[] = [];

  if (initialData?.busyTimesFromLimits && initialData?.eventTypeForLimits) {
    busyTimesFromLimits = initialData.busyTimesFromLimits.get(user.id) || [];
  } else if (eventType && (bookingLimits || durationLimits)) {
    // Fall back to individual query if not available in initialData
    busyTimesFromLimits = await getBusyTimesFromLimits(
      bookingLimits,
      durationLimits,
      dateFrom.tz(timeZone),
      dateTo.tz(timeZone),
      duration,
      eventType,
      initialData?.busyTimesFromLimitsBookings ?? [],
      timeZone,
      initialData?.rescheduleUid ?? undefined
    );
  }

  const teamForBookingLimits =
    initialData?.teamForBookingLimits ??
    eventType?.team ??
    (eventType?.parent?.team?.includeManagedEventsInLimits ? eventType?.parent?.team : null);

  const teamBookingLimits = parseBookingLimit(teamForBookingLimits?.bookingLimits);

  let busyTimesFromTeamLimits: EventBusyDetails[] = [];

  if (initialData?.teamBookingLimits && teamForBookingLimits) {
    busyTimesFromTeamLimits = initialData.teamBookingLimits.get(user.id) || [];
  } else if (teamForBookingLimits && teamBookingLimits) {
    // Fall back to individual query if not available in initialData
    busyTimesFromTeamLimits = await getBusyTimesFromTeamLimits(
      user,
      teamBookingLimits,
      dateFrom.tz(timeZone),
      dateTo.tz(timeZone),
      teamForBookingLimits.id,
      teamForBookingLimits.includeManagedEventsInLimits,
      timeZone,
      initialData?.rescheduleUid ?? undefined
    );
  }

  // TODO: only query what we need after applying limits (shrink date range)
  const getBusyTimesStart = dateFrom.toISOString();
  const getBusyTimesEnd = dateTo.toISOString();

  const selectedCalendars = eventType?.useEventLevelSelectedCalendars
    ? EventTypeRepository.getSelectedCalendarsFromUser({ user, eventTypeId: eventType.id })
    : user.userLevelSelectedCalendars;

  let busyTimes = [];
  try {
    busyTimes = await getBusyTimes({
      credentials: user.credentials,
      startTime: getBusyTimesStart,
      endTime: getBusyTimesEnd,
      eventTypeId,
      userId: user.id,
      userEmail: user.email,
      username: `${user.username}`,
      beforeEventBuffer,
      afterEventBuffer,
      selectedCalendars,
      seatedEvent: !!eventType?.seatsPerTimeSlot,
      rescheduleUid: initialData?.rescheduleUid || null,
      duration,
      currentBookings: initialData?.currentBookings,
      bypassBusyCalendarTimes,
      shouldServeCache,
    });
  } catch (error) {
    log.error(`Error fetching busy times for user ${username}:`, error);
    return {
      busy: [],
      timeZone,
      dateRanges: [],
      oooExcludedDateRanges: [],
      workingHours: [],
      dateOverrides: [],
      currentSeats: [],
      datesOutOfOffice: undefined,
    };
  }

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
    `EventType: ${eventTypeId} | User: ${username} (ID: ${userId}) - usingSchedule: ${safeStringify({
      chosenSchedule: schedule,
      eventTypeSchedule: eventType?.schedule,
      userSchedule: userSchedule,
      hostSchedule: hostSchedule,
    })}`
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
    (dependencies
      ? await dependencies.getOutOfOfficeDays(user.id, dateFrom, dateTo)
      : await _getOutOfOfficeDaysDefault(user.id, dateFrom, dateTo));

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

  const result = {
    busy: detailedBusyTimes,
    timeZone,
    dateRanges: dateRangesInWhichUserIsAvailable,
    oooExcludedDateRanges: dateRangesInWhichUserIsAvailableWithoutOOO,
    workingHours,
    dateOverrides,
    currentSeats,
    datesOutOfOffice,
  };

  log.debug(
    `EventType: ${eventTypeId} | User: ${username} (ID: ${userId}) - Result: ${safeStringify(result)}`
  );

  return result;
};

const getUserAvailabilityWithValidation = async (
  query: GetUserAvailabilityInput,
  initialData?: GetUserAvailabilityInitialData,
  dependencies?: UserAvailabilityDependencies
) => {
  const validatedQuery = availabilitySchema.parse(query);
  return _getUserAvailability(validatedQuery, initialData, dependencies);
};

export type GetUserAvailabilityQuery = z.infer<typeof availabilitySchema>;

export const getUserAvailability = withReporting(getUserAvailabilityWithValidation, "getUserAvailability");

export type GetUserAvailabilityResult = Awaited<ReturnType<typeof _getUserAvailability>>;

const _getPeriodStartDatesBetween = (
  dateFrom: Dayjs,
  dateTo: Dayjs,
  period: IntervalLimitUnit,
  timeZone?: string
): Dayjs[] => {
  const dates = [];
  let startDate = timeZone ? dayjs(dateFrom).tz(timeZone).startOf(period) : dayjs(dateFrom).startOf(period);
  const endDate = timeZone ? dayjs(dateTo).tz(timeZone).endOf(period) : dayjs(dateTo).endOf(period);

  while (startDate.isBefore(endDate)) {
    dates.push(startDate);
    startDate = startDate.add(1, period);
  }
  return dates;
};

export const getPeriodStartDatesBetween = withReporting(
  _getPeriodStartDatesBetween,
  "getPeriodStartDatesBetween"
);

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

type GetUsersAvailabilityProps = {
  users: (GetAvailabilityUser & {
    currentBookings?: GetUserAvailabilityInitialData["currentBookings"];
    outOfOfficeDays?: GetUserAvailabilityInitialData["outOfOfficeDays"];
  })[];
  query: Omit<GetUserAvailabilityInput, "userId" | "username">;
  initialData?: Omit<GetUserAvailabilityInitialData, "user">;
};

const _getUsersAvailability = async ({ users, query, initialData }: GetUsersAvailabilityProps) => {
  if (users.length >= 50) {
    const userIds = users.map(({ id }) => id).join(", ");
    log.warn(
      `High-load warning: Attempting to fetch availability for ${users.length} users. User IDs: [${userIds}], EventTypeId: [${query.eventTypeId}]`
    );
  }
  const parsedQuery = availabilitySchema.parse(query);

  return await Promise.all(
    users.map((user) =>
      _getUserAvailability(
        {
          ...parsedQuery,
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

export const getUsersAvailability = withReporting(_getUsersAvailability, "getUsersAvailability");

export interface IUserAvailabilityService {
  eventTypeRepo: EventTypeRepository;
  bookingRepo: BookingRepository;
  oooRepo: PrismaOOORepository;
  userRepo: UserRepository;
}

export class UserAvailabilityService {
  constructor(public readonly dependencies: IUserAvailabilityService) {}

  private async _getEventType(id: number): Promise<EventType | null> {
    return await this.dependencies.eventTypeRepo.findForUserAvailability({ id });
  }

  private async _getCurrentSeats(
    eventType: {
      id?: number;
      schedulingType?: any;
      hosts?: {
        user: {
          email: string;
        };
      }[];
    },
    dateFrom: Dayjs,
    dateTo: Dayjs
  ): Promise<CurrentSeats> {
    return await this.dependencies.bookingRepo.findCurrentSeats({
      eventType,
      dateFrom: dateFrom.format(),
      dateTo: dateTo.format(),
    });
  }

  private async _getOutOfOfficeDays(userId: number, dateFrom: Dayjs, dateTo: Dayjs) {
    const oooEntries = await this.dependencies.oooRepo.findManyOOO({
      startTimeDate: dateFrom.toDate(),
      endTimeDate: dateTo.toDate(),
      allUserIds: [userId],
    });

    return oooEntries.map((entry) => ({
      id: entry.id,
      start: entry.start,
      end: entry.end,
      user: entry.user,
      toUser: entry.toUser,
      reason: entry.reason,
    }));
  }

  public getEventType = withReporting(this._getEventType.bind(this), "getEventType");
  public getCurrentSeats = withReporting(this._getCurrentSeats.bind(this), "getCurrentSeats");
  public getOutOfOfficeDays = withReporting(this._getOutOfOfficeDays.bind(this), "getOutOfOfficeDays");

  async getUserAvailability(
    query: GetUserAvailabilityInput,
    initialData?: GetUserAvailabilityInitialData
  ): Promise<GetUserAvailabilityResult> {
    const getEventType = this.getEventType;
    const getCurrentSeats = this.getCurrentSeats;
    const getOutOfOfficeDays = this.getOutOfOfficeDays;

    const validatedQuery = availabilitySchema.parse(query);
    return await _getUserAvailability(validatedQuery, initialData, {
      getEventType,
      getCurrentSeats,
      getOutOfOfficeDays,
    });
  }
}
