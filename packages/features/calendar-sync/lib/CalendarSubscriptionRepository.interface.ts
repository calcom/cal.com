import type { CalendarSubscription } from "@prisma/client";

export interface ICalendarSubscriptionRepository {
  findByChannelId(channelId: string): Promise<CalendarSubscription | null>;
  findByCredentialId(credentialId: string): Promise<CalendarSubscription | null>;
  findBySelectedCalendarId(selectedCalendarId: string): Promise<CalendarSubscription | null>;

  upsertByChannelId(data: CalendarSubscription): Promise<CalendarSubscription>;
  upsertByCredentialId(data: CalendarSubscription): Promise<CalendarSubscription>;
  upsertBySelectedCalendarId(data: CalendarSubscription): Promise<CalendarSubscription>;
}
