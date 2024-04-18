import type { NextApiRequest, NextApiResponse } from "next";

import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";
import { getDefaultScheduleId } from "@calcom/trpc/server/routers/viewer/availability/util";

const travelScheduleSelect = {
  id: true,
  startDate: true,
  endDate: true,
  timeZone: true,
  prevTimeZone: true,
  user: {
    select: {
      id: true,
      timeZone: true,
      defaultScheduleId: true,
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (process.env.CRON_API_KEY !== apiKey) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ message: "Invalid method" });
    return;
  }

  let timeZonesChanged = 0;

  const setNewTimeZone = async (timeZone: string, user: { id: number; defaultScheduleId: number | null }) => {
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        timeZone: timeZone,
      },
    });

    const defaultScheduleId = await getDefaultScheduleId(user.id, prisma);

    if (!user.defaultScheduleId) {
      // set default schedule if not already set
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          defaultScheduleId,
        },
      });
    }

    await prisma.schedule.updateMany({
      where: {
        id: defaultScheduleId,
      },
      data: {
        timeZone: timeZone,
      },
    });
    timeZonesChanged++;
  };

  /* travelSchedules should be deleted automatically when timezone is set back to original tz,
    but we do this in case there cron job didn't run for some reason
  */
  const schedulesToDelete = await prisma.travelSchedule.findMany({
    where: {
      OR: [
        {
          startDate: {
            lt: dayjs.utc().subtract(2, "day").toDate(),
          },
          endDate: null,
        },
        {
          endDate: {
            lt: dayjs.utc().subtract(2, "day").toDate(),
          },
        },
      ],
    },
    select: travelScheduleSelect,
  });

  for (const travelSchedule of schedulesToDelete) {
    if (travelSchedule.prevTimeZone) {
      await setNewTimeZone(travelSchedule.prevTimeZone, travelSchedule.user);
    }
    await prisma.travelSchedule.delete({
      where: {
        id: travelSchedule.id,
      },
    });
  }

  const travelSchedulesCloseToCurrentDate = await prisma.travelSchedule.findMany({
    where: {
      OR: [
        {
          startDate: {
            gte: dayjs.utc().subtract(1, "day").toDate(),
            lte: dayjs.utc().add(1, "day").toDate(),
          },
        },
        {
          endDate: {
            gte: dayjs.utc().subtract(1, "day").toDate(),
            lte: dayjs.utc().add(1, "day").toDate(),
          },
        },
      ],
    },
    select: travelScheduleSelect,
  });

  const travelScheduleIdsToDelete = [];

  for (const travelSchedule of travelSchedulesCloseToCurrentDate) {
    const userTz = travelSchedule.user.timeZone;
    const offset = dayjs().tz(userTz).utcOffset();

    // midnight of user's time zone in utc time
    const startDateUTC = dayjs(travelSchedule.startDate).subtract(offset, "minute");
    // 23:59 of user's time zone in utc time
    const endDateUTC = dayjs(travelSchedule.endDate).subtract(offset, "minute");
    if (
      !dayjs.utc().isBefore(startDateUTC) &&
      dayjs.utc().isBefore(endDateUTC) &&
      !travelSchedule.prevTimeZone
    ) {
      // if travel schedule has started and prevTimeZone is not yet set, we need to change time zone
      await setNewTimeZone(travelSchedule.timeZone, travelSchedule.user);

      if (!travelSchedule.endDate) {
        travelScheduleIdsToDelete.push(travelSchedule.id);
      } else {
        await prisma.travelSchedule.update({
          where: {
            id: travelSchedule.id,
          },
          data: {
            prevTimeZone: travelSchedule.user.timeZone,
          },
        });
      }
    }
    if (!dayjs.utc().isBefore(endDateUTC)) {
      if (travelSchedule.prevTimeZone) {
        // travel schedule ended, change back to original timezone
        await setNewTimeZone(travelSchedule.prevTimeZone, travelSchedule.user);
      }
      travelScheduleIdsToDelete.push(travelSchedule.id);
    }
  }

  await prisma.travelSchedule.deleteMany({
    where: {
      id: {
        in: travelScheduleIdsToDelete,
      },
    },
  });

  res.status(200).json({ timeZonesChanged });
}
