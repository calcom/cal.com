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
   *  Calendars with recent subscription errors (last 24h) are skipped
   *  Calendars with 3+ subscription errors are skipped entirely
   *  Joins with TeamFeatures to filter users belonging to teams with any of the specified features enabled
   *
   * @param take the number of calendars to take
   * @param featureIds the feature IDs to filter teams by (users in teams with any of these features enabled)
   * @param integrations the list of integrations
   * @param genericCalendarSuffixes the list of generic calendar suffixes to exclude
   */
  findNextSubscriptionBatch({
    take,
    featureIds,
    integrations,
    genericCalendarSuffixes,
  }: {
    take: number;
    featureIds: string[];
    integrations: string[];
    genericCalendarSuffixes?: string[];
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
      | "syncSubscribedErrorAt"
      | "syncSubscribedErrorCount"
    >
  ): Promise<SelectedCalendar>;
}
