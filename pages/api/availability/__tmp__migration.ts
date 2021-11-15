import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@lib/prisma";

dayjs.extend(utc);
dayjs.extend(timezone);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (process.env.CRON_API_KEY !== apiKey) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }
  const users = await prisma.user.findMany({
    select: {
      id: true,
      startTime: true,
      endTime: true,
      timeZone: true,
      availability: {
        select: {
          id: true,
        },
      },
    },
  });

  const usersWithNoAvailability = users.filter((user) => user.availability.length === 0);

  for (const user of usersWithNoAvailability) {
    // convert startTime/endTime to timezone using `user.timezone`
    const baseDate = dayjs()
      .tz(user.timeZone ?? "Europe/London")
      .set("hour", 0)
      .set("minute", 0)
      .set("second", 0)
      .set("millisecond", 0);

    const startTime = baseDate.add(user.startTime, "minute").toDate();
    const endTime = baseDate.add(user.endTime, "minute").toDate();
    // create availabiltiy for every day of the week
    await prisma.availability.create({
      data: {
        userId: user.id,
        days: [0, 1, 2, 3, 4, 5, 6],
        startTime,
        endTime,
      },
    });
  }

  res.send({
    message: `${usersWithNoAvailability.length} users updated`,
  });
}
