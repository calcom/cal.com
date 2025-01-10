import prisma from "@calcom/prisma";

export class OutOfOfficeEntryRepository {
  static async findManyByUserIdsAndEndsBetween({
    userIds,
    endsBetween,
  }: {
    userIds: number[];
    endsBetween: { lte: Date; gte: Date };
  }) {
    return await prisma.outOfOfficeEntry.findMany({
      where: {
        userId: {
          in: userIds,
        },
        end: endsBetween,
      },
      select: {
        start: true,
        end: true,
        userId: true,
      },
    });
  }
}
