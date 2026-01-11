import type { Prisma, SelectedCalendar } from "@calcom/prisma/client";

export interface ISelectedCalendarRepository {
  /**
   * Find selected calendar by id
   *
   * @param id
   */
  findById(id: string): Promise<SelectedCalendar | null>;

  /**
   * Find selected calendar by channel id
   *
   * @param channelId
   */
  findByChannelId(channelId: string): Promise<SelectedCalendar | null>;

  /**
   *  Find next batch of selected calendars
   *  Will check if syncSubscribedAt is null or channelExpiration is greater than current date
   *
   * @param take the number of calendars to take
   * @param integrations the list of integrations
   */
  findNextSubscriptionBatch({
    take,
    teamIds,
    integrations,
  }: {
    take: number;
    teamIds: number[];
    integrations?: string[];
  }): Promise<SelectedCalendar[]>;

  /**
   * Update status of sync for selected calendar
   *
   * @param id
   * @param data
   */
  updateSyncStatus(
    id: string,
    data: Pick<
      Prisma.SelectedCalendarUpdateInput,
      "syncToken" | "syncedAt" | "syncErrorAt" | "syncErrorCount"
    >
  ): Promise<SelectedCalendar>;

  /**
   * Update subscription status for selected calendar
   */
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
    >
  ): Promise<SelectedCalendar>;
}
