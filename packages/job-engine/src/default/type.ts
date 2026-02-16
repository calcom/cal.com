export interface BookingPaymentReminderJob {
  userId: string;
  integrationProvider: string;
}

export interface BookingEmailJob {
  userId: string;
  integrationProvider: string;
}

export interface WhatsappTemplateSyncJob {
  userId: string;
  integrationProvider: string;
}

export interface RazorpayWebhookJob {
  userId: string;
  integrationProvider: string;
}

export type DefaultJob =
  | BookingPaymentReminderJob
  | BookingEmailJob
  | WhatsappTemplateSyncJob
  | RazorpayWebhookJob;
