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

  static async findHostsCreatedInInterval({
    eventTypeId,
    userIds,
  }: {
    eventTypeId: number;
    userIds: number[];
  }) {
    return await prisma.host.findMany({
      where: {
        eventTypeId,
        userId: {
          in: userIds,
        },
      },
      select: {
        userId: true,
        eventTypeId: true,
        priority: true,
        weight: true,
        createdAt: true,
      },
    });
  }
}
