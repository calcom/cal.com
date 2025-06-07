import { prisma } from "@calcom/prisma";

export class FilterSegmentRepository {
  static async setPreference({
    userId,
    tableIdentifier,
    segmentId,
  }: {
    userId: number;
    tableIdentifier: string;
    segmentId: number | null;
  }) {
    if (segmentId === null) {
      await prisma.userFilterSegmentPreference.deleteMany({
        where: {
          userId,
          tableIdentifier,
        },
      });
      return null;
    }

    const preference = await prisma.userFilterSegmentPreference.upsert({
      where: {
        userId_tableIdentifier: {
          userId,
          tableIdentifier,
        },
      },
      update: {
        segmentId,
      },
      create: {
        userId,
        tableIdentifier,
        segmentId,
      },
    });

    return preference;
  }
}
