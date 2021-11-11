import { Availability } from "@prisma/client";
import dayjs from "dayjs";
import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";
import { TimeRange } from "@lib/types/schedule";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });
  const userId = session?.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  if (!req.body.schedule || req.body.schedule.length !== 7) {
    return res.status(400).json({ message: "Bad Request." });
  }

  const availability = req.body.schedule.reduce(
    (availability: Availability[], times: TimeRange[], day: number) => {
      const addNewTimes = (time: TimeRange) => {
        const times = [];
        if (!dayjs(time.start).isSame(time.end, "day")) {
          times.push({
            days: [day - dayjs(time.start).diff(time.end, "day")],
            startTime: time.start,
            endTime: time.end,
          });
        }
        times.push({
          days: [day],
          startTime: time.start,
          endTime: time.end,
        });
        return times as Availability[];
      };

      const filteredTimes = times.filter((time) => {
        let idx;
        if (
          (idx = availability.findIndex(
            (schedule) => schedule.startTime === time.start && schedule.endTime === time.end
          )) !== -1
        ) {
          availability[idx].days.push(day);
          return false;
        }
        return true;
      });
      filteredTimes.forEach((time) => {
        availability.push(...addNewTimes(time));
      });
      console.log(availability);
      return availability;
    },
    [] as Availability[]
  );

  if (req.method === "POST") {
    try {
      await prisma.availability.deleteMany({
        where: {
          userId,
        },
      });
      await Promise.all(
        availability.map((schedule: Availability) =>
          prisma.availability.create({
            data: {
              days: schedule.days,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              user: {
                connect: {
                  id: userId,
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
