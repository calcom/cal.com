import { Prisma } from "@prisma/client";
import { z } from "zod";

import dayjs, { Dayjs } from "@calcom/dayjs";
import { getWorkingHours } from "@calcom/lib/availability";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { performance } from "@calcom/lib/server/perfObserver";
import prisma, { availabilityUserSelect } from "@calcom/prisma";
import { stringToDayjs } from "@calcom/prisma/zod-utils";

import { getBusyTimes } from "./getBusyTimes";

const availabilitySchema = z
  .object({
    dateFrom: stringToDayjs,
    dateTo: stringToDayjs,
    eventTypeId: z.number().optional(),
    username: z.string().optional(),
    userId: z.number().optional(),
    afterEventBuffer: z.number().optional(),
    withSource: z.boolean().optional(),
  })
  .refine((data) => !!data.username || !!data.userId, "Either username or userId should be filled in.");

const getEventType = (id: number) =>
  prisma.eventType.findUnique({
    where: { id },
    select: {
      id: true,
      seatsPerTimeSlot: true,
      timeZone: true,
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
        },
      },
    },
  });

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
  },
  initialData?: {
    user?: User;
    eventType?: EventType;
    currentSeats?: CurrentSeats;
  }
) {
  const { username, userId, dateFrom, dateTo, eventTypeId, afterEventBuffer } =
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
  if (!currentSeats && eventType?.seatsPerTimeSlot)
    currentSeats = await getCurrentSeats(eventType.id, dateFrom, dateTo);

  const { selectedCalendars, ...currentUser } = user;

  const busyTimes = await getBusyTimes({
    credentials: currentUser.credentials,
    startTime: dateFrom.toISOString(),
    endTime: dateTo.toISOString(),
    eventTypeId,
    userId: currentUser.id,
    selectedCalendars,
  });

  const bufferedBusyTimes = busyTimes.map((a) => ({
    ...a,
    start: dayjs(a.start).subtract(currentUser.bufferTime, "minute").toISOString(),
    end: dayjs(a.end)
      .add(currentUser.bufferTime + (afterEventBuffer || 0), "minute")
      .toISOString(),
    title: a.title,
    source: query.withSource ? a.source : undefined,
  }));

  const schedule = eventType?.schedule
    ? { ...eventType?.schedule }
    : {
        ...currentUser.schedules.filter(
          (schedule) => !currentUser.defaultScheduleId || schedule.id === currentUser.defaultScheduleId
        )[0],
      };

  const startGetWorkingHours = performance.now();

  const timeZone = schedule.timeZone || eventType?.timeZone || currentUser.timeZone;
  const workingHours = getWorkingHours(
    { timeZone },
    schedule.availability ||
      (eventType?.availability.length ? eventType.availability : currentUser.availability)
  );
  const endGetWorkingHours = performance.now();
  logger.debug(`getWorkingHours took ${endGetWorkingHours - startGetWorkingHours}ms for userId ${userId}`);

  return {
    busy: bufferedBusyTimes,
    timeZone,
    workingHours,
    currentSeats,
  };
}
