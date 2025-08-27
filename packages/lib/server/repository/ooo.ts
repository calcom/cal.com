import type { PrismaClient } from "@calcom/prisma";

export class PrismaOOORepository {
  constructor(private prismaClient: PrismaClient) {}

  async findManyOOO({
    startTimeDate,
    endTimeDate,
    allUserIds,
  }: {
    startTimeDate: Date;
    endTimeDate: Date;
    allUserIds: number[];
  }) {
    return this.prismaClient.outOfOfficeEntry.findMany({
      where: {
        userId: {
          in: allUserIds,
        },
        start: { lte: endTimeDate },
        end: { gte: startTimeDate },
      },
      select: {
        id: true,
        start: true,
        end: true,
        user: { select: { id: true, name: true } },
        toUser: { select: { id: true, username: true, name: true } },
        reason: { select: { id: true, emoji: true, reason: true } },
      },
    });
  }

  async findUserOOODays({ userId, dateTo, dateFrom }: { userId: number; dateTo: string; dateFrom: string }) {
    return this.prismaClient.outOfOfficeEntry.findMany({
      where: {
        userId,
        start: { lte: new Date(dateTo) },
        end: { gte: new Date(dateFrom) },
      },
      select: {
        id: true,
        start: true,
        end: true,
        user: { select: { id: true, name: true } },
        toUser: { select: { id: true, username: true, name: true } },
        reason: { select: { id: true, emoji: true, reason: true } },
      },
    });
  }

  async findOOOEntriesInInterval({
    userIds,
    startDate,
    endDate,
  }: {
    userIds: number[];
    startDate: Date;
    endDate: Date;
  }) {
    return this.prismaClient.outOfOfficeEntry.findMany({
      where: {
        userId: { in: userIds },
        start: { lte: endDate },
        end: { gte: startDate },
      },
      select: {
        start: true,
        end: true,
        userId: true,
      },
    });
  }
}
