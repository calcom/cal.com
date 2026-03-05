import type { BaseJob } from "../baseJobType";

export interface BookingExportJobData extends BaseJob {
  user: {
    id: number;
    name: string | null;
    email: string;
    timeFormat: number | null;
    timeZone: string;
  };
  filters: {
    teamIds?: number[];
    userIds?: number[];
    eventTypeIds?: number[];
    attendees?: string[];
    afterStartDate?: string;
    beforeEndDate?: string;
  };
}

export interface CalendlyImportJobData extends BaseJob {
  sendCampaignEmails: boolean;
  userCalendlyIntegrationProvider: {
    refreshToken: string;
    accessToken: string;
    ownerUniqIdentifier: string;
    createdAt: number;
    expiresIn: number;
  };
  user: {
    id: number;
    name: string;
    email: string;
    slug: string;
  };
}

export interface CalendarSyncJobData extends BaseJob {
  action?: "deltaSync" | "initialSync" | "renewSubscription" | "disableCalendarSync";
  calendarId?: number;
  providerAccountId?: string;
  reason?: "webhook" | "scheduled" | "manual";
  disableReason?: "user" | "admin" | "system";
  syncDisabledReason?: "USER_DISCONNECTED" | "USER_TOGGLED_OFF" | "SUBSCRIPTION_RENEWAL_FAILED";
  provider?: "google" | "outlook";
  receivedAt?: string;
  subscriptionId?: string | null;
  resourceId?: string | null;

  // Legacy fields retained for compatibility with existing producers.
  userId?: number | string;
  syncType?: "full" | "delta";
  cursor?: string;
}

export interface DeltaSyncWebhookJobData extends BaseJob {
  action: "deltaSync";
  calendarId: number;
  reason: "webhook";
  provider: "google" | "outlook";
  receivedAt: string;
  subscriptionId?: string | null;
  resourceId?: string | null;
}

export type DataSyncJob =
  | BookingExportJobData
  | CalendlyImportJobData
  | CalendarSyncJobData
  | DeltaSyncWebhookJobData;
