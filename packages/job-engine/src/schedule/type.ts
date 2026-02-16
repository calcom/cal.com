export interface WebhookScheduledTriggerJob {
  webhookId: string;
  integrationProvider: string;
}

export interface WhatsappReminderScheduledJob {
  webhookId: string;
  integrationProvider: string;
}

export type ScheduledJob = WebhookScheduledTriggerJob | WhatsappReminderScheduledJob;
