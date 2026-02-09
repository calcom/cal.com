export type CalendarProvider = "google" | "outlook" | "apple" | "zoho";

export interface CalendarSyncJob {
  userId: string;
  provider: CalendarProvider;
  syncType: "initial" | "incremental" | "webhook";
  cursor?: string; // delta token / sync token
  triggeredAt: string;
}
