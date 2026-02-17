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

export interface RazorpayAppRevokedJobData {
  accountId: string;
  rawEvent?: Record<string, unknown>;
}

export interface RazorpayPaymentLinkPaidJobData {
  paymentId: string;
  paymentLinkId: string;
  rawEvent?: Record<string, unknown>;
}

export type DefaultJob =
  | BookingPaymentReminderJob
  | BookingEmailJob
  | WhatsappTemplateSyncJob
  | RazorpayAppRevokedJobData
  | RazorpayPaymentLinkPaidJobData;
