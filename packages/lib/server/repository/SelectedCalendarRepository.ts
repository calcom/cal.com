import type { ISelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository.interface";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

export class SelectedCalendarRepository implements ISelectedCalendarRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findById(id: string) {
    return this.prismaClient.selectedCalendar.findUnique({
      where: { id },
    });
  }

  async findByChannelId(channelId: string) {
    return this.prismaClient.selectedCalendar.findFirst({ where: { channelId } });
  }

  async findNextSubscriptionBatch({ take, integrations }: { take: number; integrations: string[] }) {
    return this.prismaClient.selectedCalendar.findMany({
      where: {
        integration: { in: integrations },
        OR: [{ syncSubscribedAt: null }, { channelExpiration: { lte: new Date() } }],
        // initially we will run subscription only for teams that have
        // the feature flags enabled and it should be removed later
        user: {
          teams: {
            some: {
              team: {
                features: {
                  some: {
                    OR: [
                      { featureId: "calendar-subscription-cache" },
                      { featureId: "calendar-subscription-sync" },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      take,
    });
  }

  async updateSyncStatus(
    id: string,
    data: Pick<
      Prisma.SelectedCalendarUpdateInput,
      "syncToken" | "syncedAt" | "syncErrorAt" | "syncErrorCount"
    >
  ) {
    return this.prismaClient.selectedCalendar.update({
      where: { id },
      data,
    });
  }

  async updateSubscription(
    id: string,
    data: Pick<
      Prisma.SelectedCalendarUpdateInput,
      | "channelId"
      | "channelResourceId"
      | "channelResourceUri"
      | "channelKind"
      | "channelExpiration"
      | "syncSubscribedAt"
    >
  ) {
    return this.prismaClient.selectedCalendar.update({
      where: { id },
      data,
    });
  }
}
