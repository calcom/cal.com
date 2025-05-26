import prisma from "@calcom/prisma";

export class HostRepository {
  static async updateHostsSchedule(userId: number, oldScheduleId: number, newScheduleId: number) {
    return await prisma.host.updateMany({
      where: {
        userId,
        scheduleId: oldScheduleId,
      },
      data: {
        scheduleId: newScheduleId,
      },
    });
  }
}
