import { prisma } from "@calcom/prisma";

export class AppStoreRatingRepository {
  static async findApprovedByAppSlug({
    appSlug,
    take = 50,
    skip = 0,
  }: {
    appSlug: string;
    take?: number;
    skip?: number;
  }) {
    return prisma.appStoreRating.findMany({
      where: { appSlug, approved: true },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    });
  }

  static async getAggregateByAppSlug(appSlug: string) {
    const result = await prisma.appStoreRating.aggregate({
      where: { appSlug, approved: true },
      _avg: { rating: true },
      _count: { rating: true },
    });
    return {
      averageRating: result._avg.rating ?? 0,
      totalRatings: result._count.rating,
    };
  }

  static async findByUserAndApp({ userId, appSlug }: { userId: number; appSlug: string }) {
    return prisma.appStoreRating.findUnique({
      where: { appSlug_userId: { appSlug, userId } },
      select: {
        id: true,
        rating: true,
        comment: true,
        approved: true,
        createdAt: true,
      },
    });
  }

  static async upsert({
    userId,
    appSlug,
    rating,
    comment,
  }: {
    userId: number;
    appSlug: string;
    rating: number;
    comment?: string;
  }) {
    return prisma.appStoreRating.upsert({
      where: { appSlug_userId: { appSlug, userId } },
      create: { appSlug, userId, rating, comment, approved: false },
      update: { rating, comment, approved: false },
      select: { id: true, rating: true, comment: true, approved: true },
    });
  }

  static async findPendingPaginated({ take = 50, skip = 0 }: { take?: number; skip?: number }) {
    const [items, total] = await Promise.all([
      prisma.appStoreRating.findMany({
        where: { approved: false },
        select: {
          id: true,
          appSlug: true,
          rating: true,
          comment: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.appStoreRating.count({ where: { approved: false } }),
    ]);
    return { items, total };
  }

  static async approve(id: number) {
    return prisma.appStoreRating.update({
      where: { id },
      data: { approved: true },
      select: { id: true, approved: true },
    });
  }

  static async delete(id: number) {
    return prisma.appStoreRating.delete({
      where: { id },
      select: { id: true },
    });
  }
}
