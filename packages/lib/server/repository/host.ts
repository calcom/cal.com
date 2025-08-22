import type { PrismaClient } from "@calcom/prisma";

export class HostRepository {
  constructor(private prismaClient: PrismaClient) {}

  async updateHostsSchedule(userId: number, oldScheduleId: number, newScheduleId: number) {
    return await this.prismaClient.host.updateMany({
      where: {
        userId,
        scheduleId: oldScheduleId,
      },
      data: {
        scheduleId: newScheduleId,
      },
    });
  }

  async findHostsCreatedInInterval({
    eventTypeId,
    userIds,
    startDate,
    endDate,
  }: {
    eventTypeId: number;
    userIds: number[];
    startDate: Date;
    endDate: Date;
  }) {
    return await this.prismaClient.host.findMany({
      where: {
        userId: {
          in: userIds,
        },
        eventTypeId,
        isFixed: false,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
  }
}
