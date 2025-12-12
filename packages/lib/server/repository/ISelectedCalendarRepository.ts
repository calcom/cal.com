import type {
  FindNextSubscriptionBatchInputDto,
  SelectedCalendarDto,
  UpdateSubscriptionInputDto,
  UpdateSyncStatusInputDto,
} from "./dto/SelectedCalendarDto";

/**
 * ORM-agnostic interface for SelectedCalendar repository
 * Implementations can use Prisma, Kysely, or any other data access layer
 */
export interface ISelectedCalendarRepository {
  /**
   * Find selected calendar by id
   */
  findById(id: string): Promise<SelectedCalendarDto | null>;

  /**
   * Find selected calendar by channel id
   */
  findByChannelId(channelId: string): Promise<SelectedCalendarDto | null>;

  /**
   * Find next batch of selected calendars for subscription processing
   * Will check if syncSubscribedAt is null or channelExpiration is greater than current date
   */
  findNextSubscriptionBatch(input: FindNextSubscriptionBatchInputDto): Promise<SelectedCalendarDto[]>;

  /**
   * Update status of sync for selected calendar
   */
  updateSyncStatus(id: string, data: UpdateSyncStatusInputDto): Promise<SelectedCalendarDto>;

  /**
   * Update subscription status for selected calendar
   */
  updateSubscription(id: string, data: UpdateSubscriptionInputDto): Promise<SelectedCalendarDto>;
}
