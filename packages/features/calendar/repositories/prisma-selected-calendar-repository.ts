import type {
  SelectedCalendarRepository,
  SelectedCalendarByIdProjection,
  SelectedCalendarProjection,
} from "@calcom/features/calendar/repositories/selected-calendar-repository";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

const SUBSCRIPTION_SELECT = {
  id: true,
  externalId: true,
  integration: true,
  credentialId: true,
  delegationCredentialId: true,
  channelId: true,
  channelExpiration: true,
  syncSubscribedAt: true,
  syncSubscribedErrorCount: true,
  syncToken: true,
  syncedAt: true,
  syncErrorCount: true,
} as const;

export class PrismaSelectedCalendarRepository implements SelectedCalendarRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findById(id: string): Promise<SelectedCalendarByIdProjection | null> {
    return this.prismaClient.selectedCalendar.findUnique({
      where: { id },
      select: {
        ...SUBSCRIPTION_SELECT,
        userId: true,
      },
    });
  }

  async findByChannelId(channelId: string): Promise<SelectedCalendarByIdProjection | null> {
    return this.prismaClient.selectedCalendar.findFirst({
      where: { channelId },
      select: {
        ...SUBSCRIPTION_SELECT,
        userId: true,
      },
    });
  }

  async findNextSubscriptionBatch(params: {
    take: number;
    integrations: string[];
  }): Promise<SelectedCalendarProjection[]> {
    const now = new Date();

    return this.prismaClient.selectedCalendar.findMany({
      where: {
        integration: { in: params.integrations },
        OR: [{ syncSubscribedAt: null }, { channelExpiration: null }, { channelExpiration: { lte: now } }],
        AND: [{ OR: [{ credentialId: { not: null } }, { delegationCredentialId: { not: null } }] }],
      },
      select: SUBSCRIPTION_SELECT,
      take: params.take,
    });
  }

  async updateSyncStatus(
    id: string,
    data: Pick<
      Prisma.SelectedCalendarUpdateInput,
      "syncToken" | "syncedAt" | "syncErrorAt" | "syncErrorCount"
    >
  ): Promise<{ id: string }> {
    return this.prismaClient.selectedCalendar.update({
      where: { id },
      data,
      select: { id: true },
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
  ): Promise<{ id: string }> {
    return this.prismaClient.selectedCalendar.update({
      where: { id },
      data,
      select: { id: true },
    });
  }

  async updateLastWebhookReceivedAt(id: string): Promise<void> {
    await this.prismaClient.selectedCalendar.update({
      where: { id },
      data: { lastWebhookReceivedAt: new Date() },
      select: { id: true },
    });
  }

  async findStaleSubscribed(staleDays: number): Promise<SelectedCalendarProjection[]> {
    const staleDate = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);

    return this.prismaClient.selectedCalendar.findMany({
      where: {
        syncSubscribedAt: { not: null },
        AND: [
          {
            OR: [
              { lastWebhookReceivedAt: null },
              { lastWebhookReceivedAt: { lt: staleDate } },
            ],
          },
          { OR: [{ credential: null }, { credential: { invalid: { not: true } } }] },
        ],
      },
      select: SUBSCRIPTION_SELECT,
    });
  }
}
