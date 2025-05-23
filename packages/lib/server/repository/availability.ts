import prisma from "@calcom/prisma";
import { getDefaultScheduleId } from "@calcom/trpc/server/routers/viewer/availability/util";

export class AvailabilityRepository {
  static async listSchedules(userId: number) {
    const schedules = await prisma.schedule.findMany({
      where: {
        userId: userId,
      },
      select: {
        id: true,
        name: true,
        availability: true,
        timeZone: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    if (schedules.length === 0) {
      return {
        schedules: [],
      };
    }

    let defaultScheduleId: number | null;
    try {
      defaultScheduleId = await getDefaultScheduleId(userId, prisma);

      if (!defaultScheduleId) {
        await prisma.user.update({
          where: {
            id: userId,
          },
          data: {
            defaultScheduleId,
          },
        });
      }
    } catch (error) {
      defaultScheduleId = null;
    }

    return {
      schedules: schedules.map((schedule) => ({
        ...schedule,
        isDefault: schedule.id === defaultScheduleId,
      })),
    };
  }
}
