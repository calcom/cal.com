import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";

dayjs.extend(utc);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });

  if (!session) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  if (!req.body.data.schedule || req.body.data.schedule.length !== 7) {
    return res.status(400).json({ message: "Bad Request." });
  }

  const availability = req.body.data.schedule.reduce((availability, times, day) => {
    const startOfDay = dayjs.utc().startOf("day");

    const startAndEndTimesAsMinutes = (time) => ({
      ...time,
      start: -startOfDay.diff(time.start, "minute"),
      end: -startOfDay.diff(time.end, "minute"),
    });

    const addNewTime = (time) => ({
      days: [day],
      startTime: time.start,
      endTime: time.end,
    });
    if (!availability.length) {
      return times.map(startAndEndTimesAsMinutes).map(addNewTime);
    }
    const filteredTimes = times.map(startAndEndTimesAsMinutes).filter((time) => {
      let idx;
      if (
        (idx = availability.findIndex(
          (available) => available.startTime === time.start && available.endTime === time.end
        )) !== -1
      ) {
        availability[idx].days.push(day);
        return false;
      }
      return true;
    });
    filteredTimes.forEach((time) => {
      availability.push(addNewTime(time));
    });
    return availability;
  }, []);

  if (req.method === "POST") {
    try {
      await prisma.availability.deleteMany({
        where: {
          userId: session.user.id,
        },
      });
      await Promise.all(
        availability.map((schedule) =>
          prisma.availability.create({
            data: {
              ...schedule,
              user: {
                connect: {
                  id: session.user.id,
                },
              },
            },
          })
        )
      );

      return res.status(200).json({
        message: "created",
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Unable to create schedule." });
    }
  }
}
