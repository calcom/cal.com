import { AppCategories } from "@calcom/prisma/enums";
import type { PrismaClient } from "@calcom/prisma";
import { safeCredentialSelect } from "@calcom/prisma/selects/credential";

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

  async findHostsWithLocationOptions(eventTypeId: number) {
    return await this.prismaClient.host.findMany({
      where: {
        eventTypeId,
      },
      select: {
        userId: true,
        isFixed: true,
        priority: true,
        location: {
          select: {
            id: true,
            type: true,
            credentialId: true,
            link: true,
            address: true,
            phoneNumber: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            metadata: true,
            credentials: {
              where: {
                app: {
                  categories: {
                    hasSome: [AppCategories.conferencing, AppCategories.video],
                  },
                },
              },
              select: safeCredentialSelect,
            },
          },
        },
      },
      orderBy: [{ user: { name: "asc" } }, { priority: "desc" }],
    });
  }

  async findHostsWithLocationOptionsPaginated({
    eventTypeId,
    cursor,
    limit = 10,
  }: {
    eventTypeId: number;
    cursor?: number;
    limit?: number;
  }) {
    const hosts = await this.prismaClient.host.findMany({
      where: {
        eventTypeId,
        ...(cursor && { userId: { gt: cursor } }),
      },
      take: limit + 1,
      select: {
        userId: true,
        isFixed: true,
        priority: true,
        location: {
          select: {
            id: true,
            type: true,
            credentialId: true,
            link: true,
            address: true,
            phoneNumber: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            metadata: true,
            credentials: {
              where: {
                app: {
                  categories: {
                    hasSome: [AppCategories.conferencing, AppCategories.video],
                  },
                },
              },
              select: safeCredentialSelect,
            },
          },
        },
      },
      orderBy: [{ userId: "asc" }],
    });

    const hasMore = hosts.length > limit;
    const items = hasMore ? hosts.slice(0, -1) : hosts;
    const nextCursor = hasMore ? items[items.length - 1].userId : undefined;

    return { items, nextCursor, hasMore };
  }

  async findHostsWithConferencingCredentials(eventTypeId: number) {
    return await this.prismaClient.host.findMany({
      where: { eventTypeId },
      select: {
        userId: true,
        user: {
          select: {
            credentials: {
              where: {
                app: {
                  categories: {
                    hasSome: [AppCategories.conferencing, AppCategories.video],
                  },
                },
              },
              select: {
                id: true,
                type: true,
                appId: true,
              },
            },
          },
        },
      },
    });
  }
}
