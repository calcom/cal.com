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
        OR: [
          // outside of range
          // (start <= 'dateTo' AND end >= 'dateFrom')
          {
            start: {
              lte: endTimeDate,
            },
            end: {
              gte: startTimeDate,
            },
          },
          // start is between dateFrom and dateTo but end is outside of range
          // (start <= 'dateTo' AND end >= 'dateTo')
          {
            start: {
              lte: endTimeDate,
            },

            end: {
              gte: endTimeDate,
            },
          },
          // end is between dateFrom and dateTo but start is outside of range
          // (start <= 'dateFrom' OR end <= 'dateTo')
          {
            start: {
              lte: startTimeDate,
            },

            end: {
              lte: endTimeDate,
            },
          },
        ],
      },
      select: {
        id: true,
        start: true,
        end: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        toUser: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        reason: {
          select: {
            id: true,
            emoji: true,
            reason: true,
          },
        },
      },
    });
  }
}
