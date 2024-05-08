import type { Booking, Prisma, EventType as PrismaEventType } from "@prisma/client";
import { z } from "zod";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { parseBookingLimit, parseDurationLimit } from "@calcom/lib";
import { getWorkingHours } from "@calcom/lib/availability";
import type { DateOverride, WorkingHours } from "@calcom/lib/date-ranges";
import { buildDateRanges, subtract } from "@calcom/lib/date-ranges";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { HttpError } from "@calcom/lib/http-error";
import { descendingLimitKeys, intervalLimitKeyToUnit } from "@calcom/lib/intervalLimit";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { checkBookingLimit } from "@calcom/lib/server";
import { performance } from "@calcom/lib/server/perfObserver";
import { getTotalBookingDuration } from "@calcom/lib/server/queries";
import prisma, { availabilityUserSelect } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import { EventTypeMetaDataSchema, stringToDayjsZod } from "@calcom/prisma/zod-utils";
import type {
  EventBusyDate,
  EventBusyDetails,
  IntervalLimit,
  IntervalLimitUnit,
} from "@calcom/types/Calendar";
import type { TimeRange } from "@calcom/types/schedule";

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
      durationLimits: true,
      assignAllTeamMembers: true,
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

type EventType = Awaited<ReturnType<typeof getEventType>>;

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

type User = Awaited<ReturnType<typeof getUser>>;

export const getCurrentSeats = async (
  ...args: Parameters<typeof _getCurrentSeats>
): Promise<ReturnType<typeof _getCurrentSeats>> => {
  return monitorCallbackAsync(_getCurrentSeats, ...args);
};

const _getCurrentSeats = async (eventTypeId: number, dateFrom: Dayjs, dateTo: Dayjs) => {
  return await prisma.booking.findMany({
    where: {
      eventTypeId,
      startTime: {
        gte: dateFrom.format(),
        lte: dateTo.format(),
      },
      status: BookingStatus.ACCEPTED,
    },
    select: {
      uid: true,
      startTime: true,
      _count: {
        select: {
          attendees: true,
        },
      },
    },
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
  },
  initialData?: {
    user?: User;
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
    currentSeats = await getCurrentSeats(eventType.id, dateFrom, dateTo);
  }

  const bookingLimits = parseBookingLimit(eventType?.bookingLimits);
  const durationLimits = parseDurationLimit(eventType?.durationLimits);

  const busyTimesFromLimits =
    eventType && (bookingLimits || durationLimits)
      ? await getBusyTimesFromLimits(
          bookingLimits,
          durationLimits,
          dateFrom,
          dateTo,
          duration,
          eventType,
          initialData?.busyTimesFromLimitsBookings ?? []
        )
      : [];

  // TODO: only query what we need after applying limits (shrink date range)
  const getBusyTimesStart = dateFrom.toISOString();
  const getBusyTimesEnd = dateTo.toISOString();

  const busyTimes = await getBusyTimes({
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
  ];

  const userSchedule = user.schedules.filter(
    (schedule) => !user?.defaultScheduleId || schedule.id === user?.defaultScheduleId
  )[0];

  const useHostSchedulesForTeamEvent = eventType?.metadata?.config?.useHostSchedulesForTeamEvent;
  const schedule = !useHostSchedulesForTeamEvent && eventType?.schedule ? eventType.schedule : userSchedule;

  const isDefaultSchedule = userSchedule && userSchedule.id === schedule.id;

  log.debug(
    "Using schedule:",
    safeStringify({
      chosenSchedule: schedule,
      eventTypeSchedule: eventType?.schedule,
      userSchedule: userSchedule,
      useHostSchedulesForTeamEvent: eventType?.metadata?.config?.useHostSchedulesForTeamEvent,
    })
  );

  const startGetWorkingHours = performance.now();

  const timeZone = schedule?.timeZone || eventType?.timeZone || user.timeZone;

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

  const endGetWorkingHours = performance.now();

  const dateOverrides: TimeRange[] = [];
  // NOTE: getSchedule is currently calling this function for every user in a team event
  // but not using these values at all, wasting CPU. Adding this check here temporarily to avoid a larger refactor
  // since other callers do using this data.
  if (returnDateOverrides) {
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
  }

  const datesOutOfOffice = await getOutOfOfficeDays({
    userId: user.id,
    dateFrom,
    dateTo,
    availability,
  });

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

  log.debug(
    `getWorkingHours took ${endGetWorkingHours - startGetWorkingHours}ms for userId ${userId}`,
    JSON.stringify({
      workingHoursInUtc: workingHours,
      dateOverrides,
      dateRangesAsPerAvailability: dateRanges,
      dateRangesInWhichUserIsAvailable,
      detailedBusyTimes,
    })
  );

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

const getPeriodStartDatesBetween = (
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

type BusyMapKey = `${IntervalLimitUnit}-${ReturnType<Dayjs["toISOString"]>}`;

/**
 * Helps create, check, and return busy times from limits (with parallel support)
 */
class LimitManager {
  private busyMap: Map<BusyMapKey, EventBusyDate> = new Map();

  /**
   * Creates a busy map key
   */
  private static createKey(start: Dayjs, unit: IntervalLimitUnit): BusyMapKey {
    return `${unit}-${start.startOf(unit).toISOString()}`;
  }

  /**
   * Checks if already marked busy by ancestors or siblings
   */
  isAlreadyBusy(start: Dayjs, unit: IntervalLimitUnit) {
    if (this.busyMap.has(LimitManager.createKey(start, "year"))) return true;

    if (unit === "month" && this.busyMap.has(LimitManager.createKey(start, "month"))) {
      return true;
    } else if (
      unit === "week" &&
      // weeks can be part of two months
      ((this.busyMap.has(LimitManager.createKey(start, "month")) &&
        this.busyMap.has(LimitManager.createKey(start.endOf("week"), "month"))) ||
        this.busyMap.has(LimitManager.createKey(start, "week")))
    ) {
      return true;
    } else if (
      unit === "day" &&
      (this.busyMap.has(LimitManager.createKey(start, "month")) ||
        this.busyMap.has(LimitManager.createKey(start, "week")) ||
        this.busyMap.has(LimitManager.createKey(start, "day")))
    ) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Adds a new busy time
   */
  addBusyTime(start: Dayjs, unit: IntervalLimitUnit) {
    this.busyMap.set(`${unit}-${start.toISOString()}`, {
      start: start.toISOString(),
      end: start.endOf(unit).toISOString(),
    });
  }

  /**
   * Returns all busy times
   */
  getBusyTimes() {
    return Array.from(this.busyMap.values());
  }
}

const getBusyTimesFromLimits = async (
  ...args: Parameters<typeof _getBusyTimesFromLimits>
): Promise<ReturnType<typeof _getBusyTimesFromLimits>> => {
  return monitorCallbackAsync(_getBusyTimesFromLimits, ...args);
};

const _getBusyTimesFromLimits = async (
  bookingLimits: IntervalLimit | null,
  durationLimits: IntervalLimit | null,
  dateFrom: Dayjs,
  dateTo: Dayjs,
  duration: number | undefined,
  eventType: NonNullable<EventType>,
  bookings: EventBusyDetails[]
) => {
  performance.mark("limitsStart");

  // shared amongst limiters to prevent processing known busy periods
  const limitManager = new LimitManager();

  // run this first, as counting bookings should always run faster..
  if (bookingLimits) {
    performance.mark("bookingLimitsStart");
    await getBusyTimesFromBookingLimits(
      bookings,
      bookingLimits,
      dateFrom,
      dateTo,
      eventType.id,
      limitManager
    );
    performance.mark("bookingLimitsEnd");
    performance.measure(`checking booking limits took $1'`, "bookingLimitsStart", "bookingLimitsEnd");
  }

  // ..than adding up durations (especially for the whole year)
  if (durationLimits) {
    performance.mark("durationLimitsStart");
    await getBusyTimesFromDurationLimits(
      bookings,
      durationLimits,
      dateFrom,
      dateTo,
      duration,
      eventType,
      limitManager
    );
    performance.mark("durationLimitsEnd");
    performance.measure(`checking duration limits took $1'`, "durationLimitsStart", "durationLimitsEnd");
  }

  performance.mark("limitsEnd");
  performance.measure(`checking all limits took $1'`, "limitsStart", "limitsEnd");

  return limitManager.getBusyTimes();
};

const getBusyTimesFromBookingLimits = async (
  ...args: Parameters<typeof _getBusyTimesFromBookingLimits>
): Promise<ReturnType<typeof _getBusyTimesFromBookingLimits>> => {
  return monitorCallbackAsync(_getBusyTimesFromBookingLimits, ...args);
};

const _getBusyTimesFromBookingLimits = async (
  bookings: EventBusyDetails[],
  bookingLimits: IntervalLimit,
  dateFrom: Dayjs,
  dateTo: Dayjs,
  eventTypeId: number,
  limitManager: LimitManager
) => {
  for (const key of descendingLimitKeys) {
    const limit = bookingLimits?.[key];
    if (!limit) continue;

    const unit = intervalLimitKeyToUnit(key);
    const periodStartDates = getPeriodStartDatesBetween(dateFrom, dateTo, unit);

    for (const periodStart of periodStartDates) {
      if (limitManager.isAlreadyBusy(periodStart, unit)) continue;

      // special handling of yearly limits to improve performance
      if (unit === "year") {
        try {
          await checkBookingLimit({
            eventStartDate: periodStart.toDate(),
            limitingNumber: limit,
            eventId: eventTypeId,
            key,
          });
        } catch (_) {
          limitManager.addBusyTime(periodStart, unit);
          if (periodStartDates.every((start) => limitManager.isAlreadyBusy(start, unit))) {
            return;
          }
        }
        continue;
      }

      const periodEnd = periodStart.endOf(unit);
      let totalBookings = 0;

      for (const booking of bookings) {
        // consider booking part of period independent of end date
        if (!dayjs(booking.start).isBetween(periodStart, periodEnd)) {
          continue;
        }
        totalBookings++;
        if (totalBookings >= limit) {
          limitManager.addBusyTime(periodStart, unit);
          break;
        }
      }
    }
  }
};

const getBusyTimesFromDurationLimits = async (
  ...args: Parameters<typeof _getBusyTimesFromDurationLimits>
): Promise<ReturnType<typeof _getBusyTimesFromDurationLimits>> => {
  return monitorCallbackAsync(_getBusyTimesFromDurationLimits, ...args);
};

const _getBusyTimesFromDurationLimits = async (
  bookings: EventBusyDetails[],
  durationLimits: IntervalLimit,
  dateFrom: Dayjs,
  dateTo: Dayjs,
  duration: number | undefined,
  eventType: NonNullable<EventType>,
  limitManager: LimitManager
) => {
  for (const key of descendingLimitKeys) {
    const limit = durationLimits?.[key];
    if (!limit) continue;

    const unit = intervalLimitKeyToUnit(key);
    const periodStartDates = getPeriodStartDatesBetween(dateFrom, dateTo, unit);

    for (const periodStart of periodStartDates) {
      if (limitManager.isAlreadyBusy(periodStart, unit)) continue;

      const selectedDuration = (duration || eventType.length) ?? 0;

      if (selectedDuration > limit) {
        limitManager.addBusyTime(periodStart, unit);
        continue;
      }

      // special handling of yearly limits to improve performance
      if (unit === "year") {
        const totalYearlyDuration = await getTotalBookingDuration({
          eventId: eventType.id,
          startDate: periodStart.toDate(),
          endDate: periodStart.endOf(unit).toDate(),
        });
        if (totalYearlyDuration + selectedDuration > limit) {
          limitManager.addBusyTime(periodStart, unit);
          if (periodStartDates.every((start) => limitManager.isAlreadyBusy(start, unit))) {
            return;
          }
        }
        continue;
      }

      const periodEnd = periodStart.endOf(unit);
      let totalDuration = selectedDuration;

      for (const booking of bookings) {
        // consider booking part of period independent of end date
        if (!dayjs(booking.start).isBetween(periodStart, periodEnd)) {
          continue;
        }
        totalDuration += dayjs(booking.end).diff(dayjs(booking.start), "minute");
        if (totalDuration > limit) {
          limitManager.addBusyTime(periodStart, unit);
          break;
        }
      }
    }
  }
};

interface GetUserAvailabilityParamsDTO {
  userId: number;
  dateFrom: Dayjs;
  dateTo: Dayjs;
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

const getOutOfOfficeDays = async (
  ...args: Parameters<typeof _getOutOfOfficeDays>
): Promise<ReturnType<typeof _getOutOfOfficeDays>> => {
  return monitorCallbackAsync(_getOutOfOfficeDays, ...args);
};

const _getOutOfOfficeDays = async ({
  userId,
  dateFrom,
  dateTo,
  availability,
}: GetUserAvailabilityParamsDTO): Promise<IOutOfOfficeData> => {
  const outOfOfficeDays = await prisma.outOfOfficeEntry.findMany({
    where: {
      userId,
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
  });
  if (!outOfOfficeDays.length) {
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

const _getUsersAvailability = async ({
  users,
  query,
  initialData,
}: {
  users: (NonNullable<GetUserAvailabilityInitialData["user"]> & {
    currentBookings?: GetUserAvailabilityInitialData["currentBookings"];
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
