import { Prisma } from "@prisma/client";
import dayjs from "dayjs";
import { z } from "zod";

import { getWorkingHours } from "@lib/availability";
import getBusyTimes from "@lib/getBusyTimes";
import prisma from "@lib/prisma";

const toDayjs = z.string().transform((val) => dayjs(val));

const availabilitySchema = z
  .object({
    dateFrom: toDayjs,
    dateTo: toDayjs,
    eventTypeId: z.number().optional(),
    timezone: z.string().optional(),
    username: z.string().optional(),
    userId: z.number().optional(),
  })
  .refine((data) => !!data.username || !!data.userId, "Either username or userId should be filled in.");

export async function getUserAvailability(
  query: ({ username: string } | { userId: number }) & {
    dateFrom: string;
    dateTo: string;
    eventTypeId?: number;
    timezone?: string;
  }
) {
  const { username, userId, dateFrom, dateTo, eventTypeId, timezone } = availabilitySchema.parse(query);

  if (!dateFrom.isValid() || !dateTo.isValid()) throw new Error("Invalid time range given.");

  const where: Prisma.UserWhereUniqueInput = {};
  if (username) where.username = username;
  if (userId) where.id = userId;

  const rawUser = await prisma.user.findUnique({
    where,
    select: {
      credentials: true,
      timeZone: true,
      bufferTime: true,
      availability: true,
      id: true,
      startTime: true,
      endTime: true,
      selectedCalendars: true,
    },
  });

  const getEventType = (id: number) =>
    prisma.eventType.findUnique({
      where: { id },
      select: {
        timeZone: true,
        availability: {
          select: {
            startTime: true,
            endTime: true,
            days: true,
          },
        },
      },
    });

  type EventType = Prisma.PromiseReturnType<typeof getEventType>;
  let eventType: EventType | null = null;
  if (eventTypeId) eventType = await getEventType(eventTypeId);

  if (!rawUser) throw new Error("No user found");

  const { selectedCalendars, ...currentUser } = rawUser;

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
  const workingHours = getWorkingHours(
    { timeZone },
    eventType?.availability.length ? eventType.availability : currentUser.availability
  );

  return {
    busy: bufferedBusyTimes,
    timeZone,
    workingHours,
  };
}
