import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/prisma";
import { getBusyCalendarTimes } from "@lib/calendarClient";
// import { getBusyVideoTimes } from "@lib/videoClient";
import dayjs from "dayjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { user } = req.query;

  const currentUser = await prisma.user.findFirst({
    where: {
      username: user,
    },
    select: {
      credentials: true,
      timeZone: true,
      bufferTime: true,
      id: true,
    },
  });

  const selectedCalendars = await prisma.selectedCalendar.findMany({
    where: {
      userId: currentUser.id,
    },
  });

  const calendarBusyTimes = await getBusyCalendarTimes(
    currentUser.credentials,
    req.query.dateFrom,
    req.query.dateTo,
    selectedCalendars
  );
  // const videoBusyTimes = await getBusyVideoTimes(
  //   currentUser.credentials,
  //   req.query.dateFrom,
  //   req.query.dateTo
  // );
  // calendarBusyTimes.push(...videoBusyTimes);

  const bufferedBusyTimes = calendarBusyTimes.map((a) => ({
    start: dayjs(a.start).subtract(currentUser.bufferTime, "minute").toString(),
    end: dayjs(a.end).add(currentUser.bufferTime, "minute").toString(),
  }));

  res.status(200).json(bufferedBusyTimes);
}
