import type {
  CredentialLike,
  DeltaSyncResultDTO,
  InitialSyncResultDTO,
  ProviderCursorDTO,
  ProviderSubscriptionDTO,
} from "./types";
import type { CalendarProvider } from "./types";

export interface CalendarProviderAdapter {
  readonly provider: CalendarProvider;

  fetchInitialWindow(params: {
    credential: CredentialLike;
    providerCalendarId: string;
    windowStart: Date;
    windowEnd: Date;
    maxOccurrencesCap: number;
  }): Promise<InitialSyncResultDTO>;

  fetchDelta(params: {
    credential: CredentialLike;
    providerCalendarId: string;
    cursor: ProviderCursorDTO;
    windowStart: Date;
    windowEnd: Date;
    maxOccurrencesCap: number;
  }): Promise<DeltaSyncResultDTO>;

  createSubscription(params: {
    credential: CredentialLike;
    providerCalendarId: string;
    webhookUrl: string;
  }): Promise<ProviderSubscriptionDTO>;

  renewSubscription(params: {
    credential: CredentialLike;
    providerCalendarId: string;
    subscription: ProviderSubscriptionDTO;
    webhookUrl: string;
  }): Promise<ProviderSubscriptionDTO>;

  deleteSubscription(params: {
    credential: CredentialLike;
    subscription: ProviderSubscriptionDTO;
  }): Promise<void>;

  verifyWebhook(params: {
    headers: Record<string, string | string[] | undefined>;
    rawBody: string;
    providerHint?: unknown;
  }): Promise<{ isValid: boolean; reason?: string }>;

  extractWebhookRouting(params: {
    headers: Record<string, string | string[] | undefined>;
    rawBody: string;
  }): Promise<{
    providerCalendarId?: string | null;
    providerAccountId?: string | null;
    subscriptionId?: string | null;
    resourceId?: string | null;
  }>;
}
