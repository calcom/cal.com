import { Prisma } from "@prisma/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import type { NextApiRequest } from "next";
import { z } from "zod";

import { defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import { stringOrNumber, stringToDayjs } from "@calcom/prisma/zod-utils";

import { getWorkingHours } from "@lib/availability";
import { HttpError } from "@lib/core/http/error";
import { getUserAvailability } from "@lib/queries/availability";

dayjs.extend(utc);
dayjs.extend(timezone);

const availabilitySchema = z.object({
  user: z.string(),
  dateFrom: stringToDayjs,
  dateTo: stringToDayjs,
  eventTypeId: stringOrNumber,
});

async function handler(req: NextApiRequest) {
  const { user: username, eventTypeId, dateTo, dateFrom } = availabilitySchema.parse(req.query);

  if (!dateFrom.isValid() || !dateTo.isValid()) {
    throw new HttpError({ statusCode: 400, message: "Invalid time range given." });
  }

  const rawUser = await prisma.user.findUnique({
    where: {
      username,
    },
    select: {
      credentials: true,
      timeZone: true,
      bufferTime: true,
      availability: true,
      id: true,
      startTime: true,
      endTime: true,
      schedules: {
        select: {
          availability: true,
          timeZone: true,
          id: true,
        },
      },
      defaultScheduleId: true,
    },
  });

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

  type EventType = Prisma.PromiseReturnType<typeof getEventType>;
  let eventType: EventType | null = null;
  if (eventTypeId) eventType = await getEventType(eventTypeId);

  if (!rawUser) throw new Error("No user found");

  const { ...currentUser } = rawUser;

  const schedule = eventType?.schedule
    ? { ...eventType?.schedule }
    : {
        ...currentUser.schedules.filter(
          (schedule) => !currentUser.defaultScheduleId || schedule.id === currentUser.defaultScheduleId
        )[0],
      };

  const { busy, timeZone } = await getUserAvailability({
    userId: rawUser.id,
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
    eventTypeId,
    timezone: schedule.timeZone ?? undefined,
  });

  console.log("busyTimes", busy);

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
    busy,
    timeZone,
    workingHours,
    currentSeats,
  };
}

export default defaultResponder(handler);
