import prisma from "@calcom/prisma";

export class ScheduleRepository {
  static async findScheduleById({ id }: { id: number }) {
    const schedule = await prisma.schedule.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        userId: true,
        name: true,
        availability: true,
        timeZone: true,
      },
    });

    return schedule;
  }
}
