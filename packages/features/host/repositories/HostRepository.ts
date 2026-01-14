import type { PrismaClient } from "@calcom/prisma";

export type HostCreateInput = {
  userId: number;
  eventTypeId: number;
  isFixed: boolean;
};

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
  }: {
    eventTypeId: number;
    userIds: number[];
    startDate: Date;
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
        },
      },
    });
  }

  async createMany(data: HostCreateInput[]) {
    return await this.prismaClient.host.createMany({
      data,
      skipDuplicates: true,
    });
  }

  async deleteByEventTypeAndUserIds(eventTypeId: number, userIds: number[]) {
    return await this.prismaClient.host.deleteMany({
      where: {
        eventTypeId,
        userId: {
          in: userIds,
        },
      },
    });
  }
}
