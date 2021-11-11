// import { getBusyVideoTimes } from "@lib/videoClient";
import { Prisma } from "@prisma/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import type { NextApiRequest, NextApiResponse } from "next";

import { asStringOrNull } from "@lib/asStringOrNull";
import { getBusyCalendarTimes } from "@lib/calendarClient";
import prisma from "@lib/prisma";

dayjs.extend(utc);
dayjs.extend(timezone);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = asStringOrNull(req.query.user);
  const dateFrom = dayjs(asStringOrNull(req.query.dateFrom));
  const dateTo = dayjs(asStringOrNull(req.query.dateTo));
  const eventTypeId = parseInt(asStringOrNull(req.query.eventTypeId) || "");

  if (!dateFrom.isValid() || !dateTo.isValid()) {
    return res.status(400).json({ message: "Invalid time range given." });
  }

  const rawUser = await prisma.user.findUnique({
    where: {
      username: user as string,
    },
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

  const busyTimes = await getBusyCalendarTimes(
    currentUser.credentials,
    dateFrom.format(),
    dateTo.format(),
    selectedCalendars
  );

  // busyTimes.push(...await getBusyVideoTimes(currentUser.credentials, dateFrom.format(), dateTo.format()));

  const bufferedBusyTimes = busyTimes.map((a) => ({
    start: dayjs(a.start).subtract(currentUser.bufferTime, "minute").toString(),
    end: dayjs(a.end).add(currentUser.bufferTime, "minute").toString(),
  }));

  const timeZone = eventType?.timeZone || currentUser.timeZone;
  const workingHours = eventType?.availability.length ? eventType.availability : currentUser.availability;

  // FIXME: Currently the organizer timezone is used for the logic
  // refactor to be organizerTimezone unaware, use UTC instead.

  res.status(200).json({
    busy: bufferedBusyTimes,
    timeZone,
    workingHours: workingHours
      // FIXME: Currently the organizer timezone is used for the logic
      // refactor to be organizerTimezone unaware, use UTC instead.
      .map((workingHour) => ({
        days: workingHour.days,
        startTime: dayjs(workingHour.startTime).tz(timeZone).toDate(),
        endTime: dayjs(workingHour.endTime).tz(timeZone).toDate(),
      }))
      .map((workingHour) => ({
        days: workingHour.days,
        startTime: workingHour.startTime.getHours() * 60 + workingHour.startTime.getMinutes(),
        endTime: workingHour.endTime.getHours() * 60 + workingHour.endTime.getMinutes(),
      })),
  });
}
