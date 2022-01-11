// import { getBusyVideoTimes } from "@lib/videoClient";
import { Prisma } from "@prisma/client";
import dayjs from "dayjs";

import { asStringOrNull } from "@lib/asStringOrNull";
import { getWorkingHours } from "@lib/availability";
import { getBusyCalendarTimes } from "@lib/integrations/calendar/CalendarManager";
import prisma from "@lib/prisma";

export async function getUserAvailability(query: {
  username: string;
  dateFrom: string;
  dateTo: string;
  eventTypeId?: number;
  timezone?: string;
}) {
  const username = asStringOrNull(query.username);
  const dateFrom = dayjs(asStringOrNull(query.dateFrom));
  const dateTo = dayjs(asStringOrNull(query.dateTo));

  if (!username) throw new Error("Missing username");
  if (!dateFrom.isValid() || !dateTo.isValid()) throw new Error("Invalid time range given.");

  const rawUser = await prisma.user.findUnique({
    where: {
      username: username,
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
  if (query.eventTypeId) eventType = await getEventType(query.eventTypeId);

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

  const timeZone = query.timezone || eventType?.timeZone || currentUser.timeZone;
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
