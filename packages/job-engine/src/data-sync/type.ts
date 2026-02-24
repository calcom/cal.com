import type { BaseJob } from "../baseJobType";

export type CalendarProvider = "google" | "outlook" | "apple" | "zoho";

export interface CalendarSyncJobData extends BaseJob {
  userId: string;
  provider: CalendarProvider;
  syncType: "initial" | "incremental" | "webhook";
  cursor?: string; // delta token / sync token
  triggeredAt: string;
}

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

export type DataSyncJob = CalendarSyncJobData | BookingExportJobData | CalendlyImportJobData;
