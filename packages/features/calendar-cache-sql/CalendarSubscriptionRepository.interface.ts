import type { Prisma, CalendarSubscription, Credential } from "@prisma/client";

// Safe credential type that excludes sensitive fields
export type SafeCredential = Pick<Credential, "id" | "type" | "userId" | "teamId" | "appId" | "invalid">;

export interface ICalendarSubscriptionRepository {
  findBySelectedCalendar(selectedCalendarId: string): Promise<CalendarSubscription | null>;
  findByCredentialId(credentialId: number): Promise<CalendarSubscription | null>;
  findBySelectedCalendarIds(selectedCalendarIds: string[]): Promise<Array<Pick<CalendarSubscription, "id">>>;
  findByChannelId(channelId: string): Promise<
    | (CalendarSubscription & {
        selectedCalendar: {
          credential: SafeCredential | null;
          externalId: string;
          integration: string;
          userId: number;
        };
      })
    | null
  >;
  upsert(data: Prisma.CalendarSubscriptionCreateInput): Promise<CalendarSubscription>;
  upsertMany(data: Prisma.CalendarSubscriptionCreateInput[]): Promise<CalendarSubscription[]>;
  updateSyncToken(id: string, nextSyncToken: string): Promise<void>;
  updateWatchDetails(
    id: string,
    details: {
      googleChannelId: string;
      googleChannelKind?: string;
      googleChannelResourceId?: string;
      googleChannelResourceUri?: string;
      googleChannelExpiration: string;
    }
  ): Promise<void>;
  getSubscriptionsToWatch(limit?: number): Promise<CalendarSubscription[]>;
  setWatchError(id: string, error: string): Promise<void>;
  clearWatchError(id: string): Promise<void>;
}
