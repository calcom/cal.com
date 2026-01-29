import type { ISelectedCalendarRepository } from "@calcom/features/selectedCalendar/repositories/SelectedCalendarRepository.interface";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

const MAX_SUBSCRIBE_ERRORS = 3;

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

  async findNextSubscriptionBatch({
    take,
    featureIds,
    integrations,
    genericCalendarSuffixes,
  }: {
    take: number;
    featureIds: string[];
    integrations: string[];
    genericCalendarSuffixes?: string[];
  }) {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const needsSubscriptionFilter: Prisma.SelectedCalendarWhereInput = {
      OR: [
        { syncSubscribedAt: null },
        { channelExpiration: null },
        { channelExpiration: { lte: now } },
      ],
    };

    const retryableWindowFilter: Prisma.SelectedCalendarWhereInput = {
      OR: [{ syncSubscribedErrorAt: null }, { syncSubscribedErrorAt: { lt: oneDayAgo } }],
    };

    const retryableErrorCountFilter: Prisma.SelectedCalendarWhereInput = {
      syncSubscribedErrorCount: { lt: MAX_SUBSCRIBE_ERRORS },
    };

    const suffixFilters =
      genericCalendarSuffixes?.map<Prisma.SelectedCalendarWhereInput>((suffix) => ({
        NOT: { externalId: { endsWith: suffix } },
      })) ?? [];

    const andFilters = [
      needsSubscriptionFilter,
      retryableWindowFilter,
      retryableErrorCountFilter,
      ...suffixFilters,
    ];

    return this.prismaClient.selectedCalendar.findMany({
      where: {
        integration: { in: integrations },
        user: {
          teams: {
            some: {
              accepted: true,
              team: {
                features: {
                  some: {
                    featureId: { in: featureIds },
                    enabled: true,
                  },
                },
              },
            },
          },
        },
        AND: andFilters.length ? andFilters : undefined,
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
      | "syncSubscribedErrorAt"
      | "syncSubscribedErrorCount"
    >
  ) {
    return this.prismaClient.selectedCalendar.update({
      where: { id },
      data,
    });
  }
}
