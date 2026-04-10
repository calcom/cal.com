import type { Prisma, SelectedCalendar } from "@calcom/prisma/client";

export type SelectedCalendarProjection = Pick<
  SelectedCalendar,
  | "id"
  | "externalId"
  | "integration"
  | "credentialId"
  | "delegationCredentialId"
  | "channelId"
  | "channelResourceId"
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
  ): Promise<{ id: string }>;
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
  ): Promise<{ id: string }>;
  /**
   * Atomically clears all subscription channel metadata AND resets sync state
   * in a single transaction. Used by `unsubscribe` to ensure both updates
   * succeed or fail together — preventing stale channel metadata or stale
   * cache routing if one update fails independently.
   */
  clearUnsubscribeState(id: string): Promise<void>;
  updateLastWebhookReceivedAt(id: string): Promise<void>;
  findStaleSubscribed(staleDays: number): Promise<SelectedCalendarProjection[]>;
}
