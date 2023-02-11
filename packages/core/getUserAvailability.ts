import { Prisma } from "@prisma/client";
import { z } from "zod";

import dayjs, { Dayjs } from "@calcom/dayjs";
import { parseBookingLimit } from "@calcom/lib";
import { getWorkingHours } from "@calcom/lib/availability";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { checkLimit } from "@calcom/lib/server";
import { performance } from "@calcom/lib/server/perfObserver";
import prisma, { availabilityUserSelect } from "@calcom/prisma";
import { EventTypeMetaDataSchema, stringToDayjs } from "@calcom/prisma/zod-utils";
import { BookingLimit, EventBusyDetails } from "@calcom/types/Calendar";

import { getBusyTimes } from "./getBusyTimes";

const availabilitySchema = z
  .object({
    dateFrom: stringToDayjs,
    dateTo: stringToDayjs,
    eventTypeId: z.number().optional(),
    username: z.string().optional(),
    userId: z.number().optional(),
    afterEventBuffer: z.number().optional(),
    beforeEventBuffer: z.number().optional(),
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
      timeZone: true,
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

const getUser = (where: Prisma.UserWhereUniqueInput) =>
  prisma.user.findUnique({
    where,
    select: availabilityUserSelect,
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
export async function getUserAvailability(
  query: {
    withSource?: boolean;
    username?: string;
    userId?: number;
    dateFrom: string;
    dateTo: string;
    eventTypeId?: number;
    afterEventBuffer?: number;
    beforeEventBuffer?: number;
  },
  initialData?: {
    user?: User;
    eventType?: EventType;
    currentSeats?: CurrentSeats;
  }
) {
  const { username, userId, dateFrom, dateTo, eventTypeId, afterEventBuffer, beforeEventBuffer } =
    availabilitySchema.parse(query);

  if (!dateFrom.isValid() || !dateTo.isValid())
    throw new HttpError({ statusCode: 400, message: "Invalid time range given." });

  const where: Prisma.UserWhereUniqueInput = {};
  if (username) where.username = username;
  if (userId) where.id = userId;

  let user: User | null = initialData?.user || null;
  if (!user) user = await getUser(where);
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

  const { selectedCalendars, ...currentUser } = user;

  const busyTimes = await getBusyTimes({
    credentials: currentUser.credentials,
    startTime: dateFrom.toISOString(),
    endTime: dateTo.toISOString(),
    eventTypeId,
    userId: currentUser.id,
    selectedCalendars,
    beforeEventBuffer,
    afterEventBuffer,
  });

  const bufferedBusyTimes: EventBusyDetails[] = busyTimes.map((a) => ({
    ...a,
    start: dayjs(a.start).toISOString(),
    end: dayjs(a.end).toISOString(),
    title: a.title,
    source: query.withSource ? a.source : undefined,
  }));

  if (bookingLimits) {
    // Get all dates between dateFrom and dateTo
    const dates = []; // this is as dayjs date
    let startDate = dayjs(dateFrom);
    const endDate = dayjs(dateTo);
    while (startDate.isBefore(endDate)) {
      dates.push(startDate);
      startDate = startDate.add(1, "day");
    }

    const ourBookings = busyTimes.filter((busyTime) =>
      busyTime.source?.startsWith(`eventType-${eventType?.id}`)
    );

    // Apply booking limit filter against our bookings
    for (const [key, limit] of Object.entries(bookingLimits)) {
      const limitKey = key as keyof BookingLimit;

      if (limitKey === "PER_YEAR") {
        const yearlyBusyTime = await checkLimit({
          eventStartDate: startDate.toDate(),
          limitingNumber: limit,
          eventId: eventType?.id as number,
          key: "PER_YEAR",
          returnBusyTimes: true,
        });
        if (!yearlyBusyTime) break;
        bufferedBusyTimes.push({
          start: yearlyBusyTime.start.toISOString(),
          end: yearlyBusyTime.end.toISOString(),
        });
        break;
      }
      // Take PER_DAY and turn it into day and PER_WEEK into week etc.
      const filter = limitKey.split("_")[1].toLowerCase() as "day" | "week" | "month" | "year";
      // loop through all dates and check if we have reached the limit
      for (const date of dates) {
        let total = 0;
        const startDate = date.startOf(filter);
        // this is parsed above with parseBookingLimit so we know it's safe.
        const endDate = date.endOf(filter);
        for (const booking of ourBookings) {
          const bookingEventTypeId = parseInt(booking.source?.split("-")[1] as string, 10);
          if (
            // Only check OUR booking that matches the current eventTypeId
            // we don't care about another event type in this case as we dont need to know their booking limits
            !(bookingEventTypeId == eventType?.id && dayjs(booking.start).isBetween(startDate, endDate))
          ) {
            continue;
          }
          // increment total and check against the limit, adding a busy time if condition is met.
          total++;
          if (total >= limit) {
            bufferedBusyTimes.push({
              start: startDate.toISOString(),
              end: endDate.toISOString(),
            });
            break;
          }
        }
      }
    }
  }

  const userSchedule = currentUser.schedules.filter(
    (schedule) => !currentUser.defaultScheduleId || schedule.id === currentUser.defaultScheduleId
  )[0];

  const schedule =
    !eventType?.metadata?.config?.useHostSchedulesForTeamEvent && eventType?.schedule
      ? { ...eventType?.schedule }
      : {
          ...userSchedule,
          availability: userSchedule?.availability.map((a) => ({
            ...a,
            userId: currentUser.id,
          })),
        };

  const startGetWorkingHours = performance.now();

  const timeZone = schedule.timeZone || eventType?.timeZone || currentUser.timeZone;

  const availability =
    schedule.availability ||
    (eventType?.availability.length ? eventType.availability : currentUser.availability);

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

  return {
    busy: bufferedBusyTimes,
    timeZone,
    workingHours,
    dateOverrides,
    currentSeats,
  };
}
