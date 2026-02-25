import type { PrismaClient } from "@calcom/prisma";
import { prisma } from "@calcom/prisma";

export class AppStoreRatingRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  static create() {
    return new AppStoreRatingRepository(prisma);
  }

  async findApprovedBySlug({
    appSlug,
    take = 50,
    skip = 0,
  }: {
    appSlug: string;
    take?: number;
    skip?: number;
  }) {
    return this.prismaClient.appStoreRating.findMany({
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

  async getAggregateBySlug(appSlug: string) {
    const result = await this.prismaClient.appStoreRating.aggregate({
      where: { appSlug, approved: true },
      _avg: { rating: true },
      _count: { rating: true },
    });
    return {
      averageRating: result._avg.rating ?? 0,
      totalRatings: result._count.rating,
    };
  }

  async findByUserAndSlug({ userId, appSlug }: { userId: number; appSlug: string }) {
    return this.prismaClient.appStoreRating.findUnique({
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

  async upsert({
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
    return this.prismaClient.appStoreRating.upsert({
      where: { appSlug_userId: { appSlug, userId } },
      create: { appSlug, userId, rating, comment, approved: false },
      update: { rating, comment, approved: false },
      select: { id: true, rating: true, comment: true, approved: true },
    });
  }

  async findPendingPaginated({ take = 50, skip = 0 }: { take?: number; skip?: number }) {
    const [items, total] = await Promise.all([
      this.prismaClient.appStoreRating.findMany({
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
      this.prismaClient.appStoreRating.count({ where: { approved: false } }),
    ]);
    return { items, total };
  }

  async approve(id: number) {
    return this.prismaClient.appStoreRating.update({
      where: { id },
      data: { approved: true },
      select: { id: true, approved: true },
    });
  }

  async deleteById(id: number) {
    return this.prismaClient.appStoreRating.delete({
      where: { id },
      select: { id: true },
    });
  }
}
