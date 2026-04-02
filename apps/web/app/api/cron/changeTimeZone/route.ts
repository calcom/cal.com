import process from "node:process";
import dayjs from "@calcom/dayjs";
import { ScheduleRepository } from "@calcom/features/schedules/repositories/ScheduleRepository";
import prisma from "@calcom/prisma";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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

async function postHandler(request: NextRequest) {
  const apiKey = request.headers.get("authorization") || request.nextUrl.searchParams.get("apiKey");

  if (process.env.CRON_API_KEY !== apiKey) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
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

    const scheduleRepository = new ScheduleRepository(prisma);
    const defaultScheduleId = await scheduleRepository.getDefaultScheduleId(user.id);

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

  return NextResponse.json({ timeZonesChanged });
}

export const POST = defaultResponderForAppDir(postHandler);
