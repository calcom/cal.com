import type { Prisma, CalendarSubscription } from "@prisma/client";

export interface ICalendarSubscriptionRepository {
  findBySelectedCalendar(selectedCalendarId: string): Promise<CalendarSubscription | null>;
  findByChannelId(channelId: string): Promise<
    | (CalendarSubscription & {
        selectedCalendar: { credential: any; externalId: string; integration: string; userId: number };
      })
    | null
  >;
  upsert(data: Prisma.CalendarSubscriptionCreateInput): Promise<CalendarSubscription>;
  updateSyncToken(id: string, nextSyncToken: string): Promise<void>;
  updateWatchDetails(
    id: string,
    details: {
      googleChannelId: string;
      googleChannelToken?: string;
      googleChannelExpiration: string;
    }
  ): Promise<void>;
  getSubscriptionsToWatch(limit?: number): Promise<CalendarSubscription[]>;
  setWatchError(id: string, error: string): Promise<void>;
  clearWatchError(id: string): Promise<void>;
}
