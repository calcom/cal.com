import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import {
  getBusyTimesFromLimits,
  getBusyTimesFromTeamLimits,
} from "@calcom/features/busyTimes/lib/getBusyTimesFromLimits";
import { getBusyTimesService } from "@calcom/features/di/containers/BusyTimes";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import type { IRedisService } from "@calcom/features/redis/IRedisService";
import { getWorkingHours } from "@calcom/lib/availability";
import type { DateOverride, WorkingHours } from "@calcom/lib/date-ranges";
import { buildDateRanges, subtract } from "@calcom/lib/date-ranges";
import { stringToDayjsZod } from "@calcom/lib/dayjs";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { HttpError } from "@calcom/lib/http-error";
import { parseBookingLimit } from "@calcom/lib/intervalLimits/isBookingLimits";
import { parseDurationLimit } from "@calcom/lib/intervalLimits/isDurationLimits";
import { getPeriodStartDatesBetween as getPeriodStartDatesBetweenUtil } from "@calcom/lib/intervalLimits/utils/getPeriodStartDatesBetween";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { withReporting } from "@calcom/lib/sentryWrapper";
import type { PrismaOOORepository } from "@calcom/lib/server/repository/ooo";
import type {
  Booking,
  Prisma,
  OutOfOfficeEntry,
  OutOfOfficeReason,
  User,
  EventType as PrismaEventType,
} from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { EventBusyDetails, IntervalLimitUnit } from "@calcom/types/Calendar";
import type { TimeRange } from "@calcom/types/schedule";

import { findUsersForAvailabilityCheck } from "./findUsersForAvailabilityCheck";

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
    silentlyHandleCalendarFailures: z.boolean().optional(),
    shouldServeCache: z.boolean().optional(),
  })
  .refine((data) => !!data.username || !!data.userId, "Either username or userId should be filled in.");

export type EventType = Awaited<ReturnType<(typeof UserAvailabilityService)["prototype"]["_getEventType"]>>;

type GetUser = Awaited<ReturnType<(typeof UserAvailabilityService)["prototype"]["_getUser"]>>;

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

type GetUserAvailabilityQuery = {
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
  silentlyHandleCalendarFailures?: boolean;
  shouldServeCache?: boolean;
};

export type CurrentSeats = Awaited<
  ReturnType<(typeof UserAvailabilityService)["prototype"]["_getCurrentSeats"]>
>;

export type GetUserAvailabilityResult = Awaited<
  ReturnType<(typeof UserAvailabilityService)["prototype"]["_getUserAvailability"]>
>;

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

type GetUsersAvailabilityProps = {
  users: (GetAvailabilityUser & {
    currentBookings?: GetUserAvailabilityInitialData["currentBookings"];
    outOfOfficeDays?: GetUserAvailabilityInitialData["outOfOfficeDays"];
  })[];
  query: Omit<GetUserAvailabilityQuery, "userId" | "username">;
  initialData?: Omit<GetUserAvailabilityInitialData, "user">;
};

export interface IUserAvailabilityService {
  eventTypeRepo: EventTypeRepository;
  oooRepo: PrismaOOORepository;
  bookingRepo: BookingRepository;
  redisClient: IRedisService;
}

export class UserAvailabilityService {
  constructor(public readonly dependencies: IUserAvailabilityService) {}

  // Fetch timezones from outlook or google using delegated credentials (formely known as domain wide delegatiion)
  async getTimezoneFromDelegatedCalendars(user: GetAvailabilityUser): Promise<string | null> {
    if (!user.credentials || user.credentials.length === 0) {
      return null;
    }

    const delegatedCredentials = user.credentials.filter(
      (credential) => credential.type.endsWith("_calendar") && Boolean(credential.delegatedToId)
    );

    if (!delegatedCredentials || delegatedCredentials.length === 0) {
      return null;
    }

    const cacheKey = `user-timezone:${user.id}`;

    try {
      const cachedTimezone = await this.dependencies.redisClient.get<string>(cacheKey);

      if (cachedTimezone) {
        log.debug(`Got timezone ${cachedTimezone} from Redis cache for user ${user.id}`);
        return cachedTimezone;
      }
    } catch (error) {
      log.warn(`Failed to get timezone from Redis cache for user ${user.id}:`, error);
    }

    if (delegatedCredentials.length === 0) {
      return null;
    }

    for (const credential of delegatedCredentials) {
      try {
        const calendar = await getCalendar(credential);
        if (calendar && "getMainTimeZone" in calendar && typeof calendar.getMainTimeZone === "function") {
          const timezone = await calendar.getMainTimeZone();
          if (timezone && timezone !== "UTC") {
            log.debug(`Got timezone ${timezone} from calendar service ${credential.type}`);

            try {
              await this.dependencies.redisClient.set<string>(cacheKey, timezone, { ttl: 3600 * 6 * 1000 }); // 6 hours ttl in ms;
              log.debug(`Cached timezone ${timezone} in Redis for user ${user.id}`);
            } catch (error) {
              log.warn(`Failed to set timezone in Redis cache for user ${user.id}:`, error);
            }

            return timezone;
          }
        }
      } catch (error) {
        log.warn(`Failed to get timezone from calendar service ${credential.type}:`, error);
      }
    }

    return null;
  }

  async _getEventType(id: number) {
    const eventType = await this.dependencies.eventTypeRepo.findByIdForUserAvailability({ id });
    if (!eventType) {
      return eventType;
    }
    return {
      ...eventType,
      metadata: EventTypeMetaDataSchema.parse(eventType.metadata),
    };
  }

  getEventType = withReporting(this._getEventType.bind(this), "getEventType");

  async _getUser(where: Prisma.UserWhereInput) {
    return findUsersForAvailabilityCheck({ where });
  }
  getUser = withReporting(this._getUser.bind(this), "getUser");

  async _getCurrentSeats(
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
  ) {
    const { schedulingType, hosts, id } = eventType;
    const hostEmails = hosts?.map((host) => host.user.email);
    const isTeamEvent =
      schedulingType === SchedulingType.MANAGED ||
      schedulingType === SchedulingType.ROUND_ROBIN ||
      schedulingType === SchedulingType.COLLECTIVE;

    const bookings = await this.dependencies.bookingRepo.findAcceptedBookingByEventTypeId({
      eventTypeId: id,
      dateFrom: dateFrom.format(),
      dateTo: dateTo.format(),
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
  }

  getCurrentSeats = withReporting(this._getCurrentSeats.bind(this), "getCurrentSeats");

  /** This should be called getUsersWorkingHoursAndBusySlots (...and remaining seats, and final timezone) */
  async _getUserAvailability(query: GetUserAvailabilityQuery, initialData?: GetUserAvailabilityInitialData) {
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
      silentlyHandleCalendarFailures = false,
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

    const user = initialData?.user || (await this.getUser(where));

    if (!user) {
      throw new HttpError({ statusCode: 404, message: "No user found in getUserAvailability" });
    }

    let eventType: EventType | null = initialData?.eventType || null;
    if (!eventType && eventTypeId) eventType = await this.getEventType(eventTypeId);

    /* Current logic is if a booking is in a time slot mark it as busy, but seats can have more than one attendee so grab
    current bookings with a seats event type and display them on the calendar, even if they are full */
    let currentSeats: CurrentSeats | null = initialData?.currentSeats || null;
    if (!currentSeats && eventType?.seatsPerTimeSlot) {
      currentSeats = await this.getCurrentSeats(eventType, dateFrom, dateTo);
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

    // possible timezones that have been set by or for a user
    const potentialSchedule = eventType?.schedule
      ? eventType.schedule
      : hostSchedule
      ? hostSchedule
      : userSchedule;

    // if no schedules set by or for a user, use fallbackSchedule
    const schedule = potentialSchedule ?? fallbackSchedule;

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

    // TODO: only query what we need after applying limits (shrink date range)
    const getBusyTimesStart = dateFrom.toISOString();
    const getBusyTimesEnd = dateTo.toISOString();

    const selectedCalendars = eventType?.useEventLevelSelectedCalendars
      ? EventTypeRepository.getSelectedCalendarsFromUser({ user, eventTypeId: eventType.id })
      : user.userLevelSelectedCalendars;

    const isTimezoneSet = Boolean(potentialSchedule && potentialSchedule.timeZone !== null);

    // this timezone is synced with google/outlook calendars timezone usingg delegated credentials
    // it's a fallback for delegated credentials users who want to sync their timezone with third party calendars
    const calendarTimezone = !isTimezoneSet ? await this.getTimezoneFromDelegatedCalendars(user) : null;

    const finalTimezone =
      !isTimezoneSet && calendarTimezone
        ? calendarTimezone
        : schedule?.timeZone || fallbackTimezoneIfScheduleIsMissing;

    let busyTimesFromLimits: EventBusyDetails[] = [];

    if (initialData?.busyTimesFromLimits && initialData?.eventTypeForLimits) {
      busyTimesFromLimits = initialData.busyTimesFromLimits.get(user.id) || [];
    } else if (eventType && (bookingLimits || durationLimits)) {
      // Fall back to individual query if not available in initialData
      busyTimesFromLimits = await getBusyTimesFromLimits(
        bookingLimits,
        durationLimits,
        dateFrom.tz(finalTimezone),
        dateTo.tz(finalTimezone),
        duration,
        eventType,
        initialData?.busyTimesFromLimitsBookings ?? [],
        finalTimezone,
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
        dateFrom.tz(finalTimezone),
        dateTo.tz(finalTimezone),
        teamForBookingLimits.id,
        teamForBookingLimits.includeManagedEventsInLimits,
        finalTimezone,
        initialData?.rescheduleUid ?? undefined
      );
    }

    let busyTimes = [];
    try {
      const busyTimesService = getBusyTimesService();
      busyTimes = await busyTimesService.getBusyTimes({
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
        silentlyHandleCalendarFailures,
        shouldServeCache,
      });
    } catch (error) {
      log.error(`Error fetching busy times for user ${username}:`, error);
      return {
        busy: [],
        timeZone: finalTimezone,
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
      !(
        schedule?.availability ||
        (eventType?.availability.length ? eventType.availability : user.availability)
      )
    ) {
      throw new HttpError({ statusCode: 400, message: ErrorCode.AvailabilityNotFoundInSchedule });
    }

    const availability = (
      schedule?.availability || (eventType?.availability.length ? eventType.availability : user.availability)
    ).map((a) => ({
      ...a,
      userId: user.id,
    }));

    const workingHours = getWorkingHours({ timeZone: finalTimezone }, availability);

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
      (await this.dependencies.oooRepo.findUserOOODays({
        userId: user.id,
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
      }));

    const datesOutOfOffice: IOutOfOfficeData = this.calculateOutOfOfficeRanges(outOfOfficeDays, availability);

    const { dateRanges, oooExcludedDateRanges } = buildDateRanges({
      dateFrom,
      dateTo,
      availability,
      timeZone: finalTimezone,
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
      timeZone: finalTimezone,
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
  }

  getUserAvailability = withReporting(this._getUserAvailability.bind(this), "getUserAvailability");

  getPeriodStartDatesBetween = withReporting(
    (dateFrom: Dayjs, dateTo: Dayjs, period: IntervalLimitUnit, timeZone?: string) =>
      getPeriodStartDatesBetweenUtil(dateFrom, dateTo, period, timeZone),
    "getPeriodStartDatesBetween"
  );

  calculateOutOfOfficeRanges(
    outOfOfficeDays: GetUserAvailabilityInitialData["outOfOfficeDays"],
    availability: GetUserAvailabilityParamsDTO["availability"]
  ): IOutOfOfficeData {
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
  }

  async _getUsersAvailability({ users, query, initialData }: GetUsersAvailabilityProps) {
    if (users.length >= 50) {
      const userIds = users.map(({ id }) => id).join(", ");
      log.warn(
        `High-load warning: Attempting to fetch availability for ${users.length} users. User IDs: [${userIds}], EventTypeId: [${query.eventTypeId}]`
      );
    }
    return await Promise.all(
      users.map((user) =>
        this._getUserAvailability(
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
  }

  getUsersAvailability = withReporting(this._getUsersAvailability.bind(this), "getUsersAvailability");
}
