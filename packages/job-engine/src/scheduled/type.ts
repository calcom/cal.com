import type { BaseJob } from "../baseJobType";

export interface TriggerScheduledWebhookData extends BaseJob {
  id: number;
}

export interface WhatsappReminderScheduledJob extends BaseJob {
  webhookId: string;
  integrationProvider: string;
}

export interface SyncWhatsappTemplatesData extends BaseJob {
  // Empty for now, could add filters in the future
  phoneNumberIds?: string[];
}

export type ScheduledJob =
  | TriggerScheduledWebhookData
  | WhatsappReminderScheduledJob
  | SyncWhatsappTemplatesData;
