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

    // set new tz to default schedule (same as we do in updateProfile.handler.ts)
    await prisma.schedule.updateMany({
      where: {
        id: defaultScheduleId,
      },
      data: {
        timeZone: timeZone,
      },
    });
  };

  /* travelSchedules should be deleted automatically when timezone is set back to original tz,
    but we do this in case there cron job didn't run for some reason
  */
  const schedulesToDelete = await prisma.travelSchedule.findMany({
    where: {
      OR: [
        {
          startDate: {
            lt: dayjs().subtract(1, "day").toDate(),
          },
          endDate: null, //test if this works as expected
        },
        {
          endDate: {
            lt: dayjs().subtract(1, "day").toDate(),
          },
        },
      ],
    },
    select: travelScheduleSelect,
  });

  for (const travelSchedule of schedulesToDelete) {
    if (travelSchedule.prevTimeZone) {
      setNewTimeZone(travelSchedule.prevTimeZone, travelSchedule.user);
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
            gte: dayjs().subtract(1, "day").toDate(),
            lte: dayjs().add(1, "day").toDate(),
          },
        },
        {
          endDate: {
            gte: dayjs().subtract(1, "day").toDate(),
            lte: dayjs().add(1, "day").toDate(),
          },
        },
      ],
    },
    select: travelScheduleSelect,
  });

  for (const travelSchedule of travelSchedulesCloseToCurrentDate) {
    const userTz = travelSchedule.user.timeZone;
    const offset = dayjs().tz(userTz).utcOffset();

    // midnight in user's time zone
    const startDateUserTz = dayjs(travelSchedule.startDate).subtract(offset, "minute").tz(userTz);
    // 23:59 in user's time zone
    const endDateUserTz = dayjs(travelSchedule.endDate).subtract(offset, "minute").tz(userTz);

    if (dayjs().isAfter(startDateUserTz) && !travelSchedule.prevTimeZone) {
      // travel schedule has started and new timezone wasn't set yet
      setNewTimeZone(travelSchedule.timeZone, travelSchedule.user);

      if (!endDateUserTz) {
        await prisma.travelSchedule.delete({
          where: {
            id: travelSchedule.id,
          },
        });
      } else {
        await prisma.travelSchedule.update({
          where: {
            id: travelSchedule.id,
          },
          data: {
            prevTimeZone: userTz,
          },
        });
      }
    }
    if (dayjs().isAfter(endDateUserTz))
      if (travelSchedule.prevTimeZone) {
        // travel schedule ended, change back to original timezone
        setNewTimeZone(travelSchedule.prevTimeZone, travelSchedule.user);
      }
    await prisma.travelSchedule.delete({
      where: {
        id: travelSchedule.id,
      },
    });
  }
}
