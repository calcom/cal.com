import { Prisma } from "@prisma/client";
import dayjs from "dayjs";
import { z } from "zod";

import { getWorkingHours } from "@calcom/lib/availability";
import { HttpError } from "@calcom/lib/http-error";
import prisma, { availabilityUserSelect } from "@calcom/prisma";
import { stringToDayjs } from "@calcom/prisma/zod-utils";

import { getBusyTimes } from "./getBusyTimes";

const availabilitySchema = z
  .object({
    dateFrom: stringToDayjs,
    dateTo: stringToDayjs,
    eventTypeId: z.number().optional(),
    timezone: z.string().optional(),
    username: z.string().optional(),
    userId: z.number().optional(),
  })
  .refine((data) => !!data.username || !!data.userId, "Either username or userId should be filled in.");

const getEventType = (id: number) =>
  prisma.eventType.findUnique({
    where: { id },
    select: {
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

export async function getUserAvailability(
  query: ({ username: string } | { userId: number }) & {
    dateFrom: string;
    dateTo: string;
    eventTypeId?: number;
    timezone?: string;
  },
  initialData?: {
    user?: User;
    eventType?: EventType;
  }
) {
  const { username, userId, dateFrom, dateTo, eventTypeId, timezone } = availabilitySchema.parse(query);

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
    start: dayjs(a.start).subtract(currentUser.bufferTime, "minute").toISOString(),
    end: dayjs(a.end).add(currentUser.bufferTime, "minute").toISOString(),
  }));

  const timeZone = timezone || eventType?.timeZone || currentUser.timeZone;

  const schedule = eventType?.schedule
    ? { ...eventType?.schedule }
    : {
        ...currentUser.schedules.filter(
          (schedule) => !currentUser.defaultScheduleId || schedule.id === currentUser.defaultScheduleId
        )[0],
      };

  const workingHours = getWorkingHours(
    { timeZone },
    schedule.availability ||
      (eventType?.availability.length ? eventType.availability : currentUser.availability)
  );

  /* Current logic is if a booking is in a time slot mark it as busy, but seats can have more than one attendee so grab
  current bookings with a seats event type and display them on the calendar, even if they are full */
  let currentSeats;
  if (eventType?.seatsPerTimeSlot) {
    currentSeats = await prisma.booking.findMany({
      where: {
        eventTypeId: eventTypeId,
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
  }

  return {
    busy: bufferedBusyTimes,
    timeZone,
    workingHours,
    currentSeats,
  };
}
