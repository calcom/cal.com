import { prisma } from "@calcom/prisma";
import { getDefaultScheduleId } from "@calcom/trpc/server/routers/viewer/availability/util";

export class AvailabilityRepository {
  static async getList({
    userId,
    defaultScheduleId: defaultScheduleIdArg,
  }: {
    userId: number;
    defaultScheduleId: number | null;
  }) {
    const schedules = await prisma.schedule.findMany({
      where: {
        userId,
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

    const defaultScheduleId = await getDefaultScheduleId(userId, prisma);

    if (!defaultScheduleIdArg) {
      await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          defaultScheduleId,
        },
      });
    }

    return {
      schedules: schedules.map((schedule) => ({
        ...schedule,
        isDefault: schedule.id === defaultScheduleId,
      })),
    };
  }
}
