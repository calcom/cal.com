import type { Prisma, SelectedCalendar } from "@calcom/prisma/client";

export type SelectedCalendarProjection = Pick<
  SelectedCalendar,
  | "id"
  | "externalId"
  | "integration"
  | "credentialId"
  | "delegationCredentialId"
  | "channelId"
  | "channelExpiration"
  | "syncSubscribedAt"
  | "syncSubscribedErrorCount"
  | "syncToken"
  | "syncedAt"
  | "syncErrorCount"
>;

export type SelectedCalendarByIdProjection = SelectedCalendarProjection & Pick<SelectedCalendar, "userId">;

export interface SelectedCalendarRepository {
  findById(id: string): Promise<SelectedCalendarByIdProjection | null>;
  findByChannelId(channelId: string): Promise<SelectedCalendarByIdProjection | null>;
  findNextSubscriptionBatch(params: {
    take: number;
    integrations: string[];
  }): Promise<SelectedCalendarProjection[]>;
  updateSyncStatus(
    id: string,
    data: Pick<
      Prisma.SelectedCalendarUpdateInput,
      "syncToken" | "syncedAt" | "syncErrorAt" | "syncErrorCount"
    >
  ): Promise<SelectedCalendar>;
  updateSubscription(
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
  ): Promise<SelectedCalendar>;
  updateLastWebhookReceivedAt(id: string): Promise<void>;
  findStaleSubscribed(staleDays: number): Promise<SelectedCalendarProjection[]>;
}
