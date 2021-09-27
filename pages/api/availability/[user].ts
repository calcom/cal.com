// import { getBusyVideoTimes } from "@lib/videoClient";
import dayjs from "dayjs";
import type { NextApiRequest, NextApiResponse } from "next";

import { asStringOrNull } from "@lib/asStringOrNull";
import { getBusyCalendarTimes } from "@lib/calendarClient";
import prisma from "@lib/prisma";

import { Prisma } from ".prisma/client";

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
  const defaultAvailability = {
    startTime: currentUser.startTime,
    endTime: currentUser.endTime,
    days: [0, 1, 2, 3, 4, 5, 6],
  };
  const workingHours = eventType?.availability.length
    ? eventType.availability
    : // currentUser.availability /* note(zomars) There's no UI nor default for this as of today */
      [defaultAvailability]; /* note(zomars) For now, make every day available as fallback */

  res.status(200).json({
    busy: bufferedBusyTimes,
    timeZone,
    workingHours,
  });
}
