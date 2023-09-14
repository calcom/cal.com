import type { Booking, Prisma, EventType as PrismaEventType } from "@prisma/client";
import { z } from "zod";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { parseBookingLimit, parseDurationLimit } from "@calcom/lib";
import { getWorkingHours } from "@calcom/lib/availability";
import { buildDateRanges, subtract } from "@calcom/lib/date-ranges";
import { HttpError } from "@calcom/lib/http-error";
import { descendingLimitKeys, intervalLimitKeyToUnit } from "@calcom/lib/intervalLimit";
import logger from "@calcom/lib/logger";
import { checkBookingLimit } from "@calcom/lib/server";
import { performance } from "@calcom/lib/server/perfObserver";
import { getTotalBookingDuration } from "@calcom/lib/server/queries";
import prisma, { availabilityUserSelect } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema, stringToDayjs } from "@calcom/prisma/zod-utils";
import type {
  EventBusyDate,
  EventBusyDetails,
  IntervalLimit,
  IntervalLimitUnit,
} from "@calcom/types/Calendar";

import { getBusyTimes, getBusyTimesForLimitChecks } from "./getBusyTimes";

const availabilitySchema = z
  .object({
    dateFrom: stringToDayjs,
    dateTo: stringToDayjs,
    eventTypeId: z.number().optional(),
    username: z.string().optional(),
    userId: z.number().optional(),
    afterEventBuffer: z.number().optional(),
    beforeEventBuffer: z.number().optional(),
    duration: z.number().optional(),
    withSource: z.boolean().optional(),
  })
  .refine((data) => !!data.username || !!data.userId, "Either username or userId should be filled in.");

const getEventType = async (id: number) => {
  const eventType = await prisma.eventType.findUnique({
    where: { id },
    select: {
      id: true,
      seatsPerTimeSlot: true,
      bookingLimits: true,
      durationLimits: true,
      timeZone: true,
      length: true,
      metadata: true,
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

const getUser = (where: Prisma.UserWhereInput) =>
  prisma.user.findFirst({
    where,
    select: {
      ...availabilityUserSelect,
      credentials: true,
    },
  });

type User = Awaited<ReturnType<typeof getUser>>;

export const getCurrentSeats = (eventTypeId: number, dateFrom: Dayjs, dateTo: Dayjs) =>
  prisma.booking.findMany({
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

export type CurrentSeats = Awaited<ReturnType<typeof getCurrentSeats>>;

/** This should be called getUsersWorkingHoursAndBusySlots (...and remaining seats, and final timezone) */
export const getUserAvailability = async function getUsersWorkingHoursLifeTheUniverseAndEverythingElse(
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
  }
) {
  const { username, userId, dateFrom, dateTo, eventTypeId, afterEventBuffer, beforeEventBuffer, duration } =
    availabilitySchema.parse(query);

  if (!dateFrom.isValid() || !dateTo.isValid()) {
    throw new HttpError({ statusCode: 400, message: "Invalid time range given." });
  }

  const where: Prisma.UserWhereInput = {};
  if (username) where.username = username;
  if (userId) where.id = userId;

  const user = initialData?.user || (await getUser(where));
  if (!user) throw new HttpError({ statusCode: 404, message: "No user found" });

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
          user.id
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

  const schedule =
    !eventType?.metadata?.config?.useHostSchedulesForTeamEvent && eventType?.schedule
      ? eventType.schedule
      : userSchedule;

  const startGetWorkingHours = performance.now();

  const timeZone = schedule?.timeZone || eventType?.timeZone || user.timeZone;

  const availability = (
    schedule.availability || (eventType?.availability.length ? eventType.availability : user.availability)
  ).map((a) => ({
    ...a,
    userId: user.id,
  }));

  const workingHours = getWorkingHours({ timeZone }, availability);

  const endGetWorkingHours = performance.now();
  logger.debug(`getWorkingHours took ${endGetWorkingHours - startGetWorkingHours}ms for userId ${userId}`);

  const dateOverrides = availability
    .filter((availability) => !!availability.date)
    .map((override) => {
      const startTime = dayjs.utc(override.startTime);
      const endTime = dayjs.utc(override.endTime);
      return {
        start: dayjs.utc(override.date).hour(startTime.hour()).minute(startTime.minute()).toDate(),
        end: dayjs.utc(override.date).hour(endTime.hour()).minute(endTime.minute()).toDate(),
      };
    });

  const dateRanges = buildDateRanges({
    dateFrom,
    dateTo,
    availability,
    timeZone,
  });

  const formattedBusyTimes = detailedBusyTimes.map((busy) => ({
    start: dayjs(busy.start),
    end: dayjs(busy.end),
  }));

  return {
    busy: detailedBusyTimes,
    timeZone,
    dateRanges: subtract(dateRanges, formattedBusyTimes),
    workingHours,
    dateOverrides,
    currentSeats,
  };
};

const getPeriodStartDatesBetween = (dateFrom: Dayjs, dateTo: Dayjs, period: IntervalLimitUnit) => {
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
  bookingLimits: IntervalLimit | null,
  durationLimits: IntervalLimit | null,
  dateFrom: Dayjs,
  dateTo: Dayjs,
  duration: number | undefined,
  eventType: NonNullable<EventType>,
  userId: number
) => {
  performance.mark("limitsStart");

  // shared amongst limiters to prevent processing known busy periods
  const limitManager = new LimitManager();

  let limitDateFrom = dayjs(dateFrom);
  let limitDateTo = dayjs(dateTo);

  // expand date ranges by absolute minimum required to apply limits
  // (yearly limits are handled separately for performance)
  for (const key of ["PER_MONTH", "PER_WEEK", "PER_DAY"] as Exclude<keyof IntervalLimit, "PER_YEAR">[]) {
    if (bookingLimits?.[key] || durationLimits?.[key]) {
      const unit = intervalLimitKeyToUnit(key);
      limitDateFrom = dayjs.min(limitDateFrom, dateFrom.startOf(unit));
      limitDateTo = dayjs.max(limitDateTo, dateTo.endOf(unit));
    }
  }

  // fetch only the data we need to check limits
  const bookings = await getBusyTimesForLimitChecks({
    userId,
    eventTypeId: eventType.id,
    startDate: limitDateFrom.toDate(),
    endDate: limitDateTo.toDate(),
  });

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
