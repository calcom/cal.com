export interface TriggerScheduledWebhookData {
  id: number;
}

export interface WhatsappReminderScheduledJob {
  webhookId: string;
  integrationProvider: string;
}

export interface SyncWhatsappTemplatesData {
  // Empty for now, could add filters in the future
  phoneNumberIds?: string[];
}

export type ScheduledJob =
  | TriggerScheduledWebhookData
  | WhatsappReminderScheduledJob
  | SyncWhatsappTemplatesData;
