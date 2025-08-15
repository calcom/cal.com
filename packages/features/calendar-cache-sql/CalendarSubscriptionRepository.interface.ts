import type { CalendarSubscription, Credential } from "@prisma/client";

// Safe credential type that excludes sensitive fields
export type SafeCredential = Pick<Credential, "id" | "type" | "userId" | "teamId" | "appId" | "invalid">;

export type SubscriptionWithSelectedCalendar = CalendarSubscription & {
  selectedCalendar: {
    id: string;
    externalId: string;
    integration: string;
    userId: number;
    credential: SafeCredential | null;
  };
};

export interface ICalendarSubscriptionRepository {
  findBySelectedCalendar(selectedCalendarId: string): Promise<CalendarSubscription | null>;
  findByCredentialId(credentialId: number): Promise<CalendarSubscription | null>;
  findBySelectedCalendarIds(
    selectedCalendarIds: string[]
  ): Promise<Array<Pick<CalendarSubscription, "id" | "selectedCalendarId" | "updatedAt">>>;
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
  upsertBySelectedCalendarId(selectedCalendarId: string): Promise<CalendarSubscription>;
  upsertManyBySelectedCalendarId(selectedCalendarIds: string[]): Promise<CalendarSubscription[]>;
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
  getSubscriptionsToWatch(limit?: number): Promise<SubscriptionWithSelectedCalendar[]>;
  setWatchError(id: string, error: string): Promise<void>;
  clearWatchError(id: string): Promise<void>;
}
