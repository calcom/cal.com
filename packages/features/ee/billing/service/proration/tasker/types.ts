export type MonthlyProrationBatchPayload = {
  monthKey: string;
  teamIds: number[];
};

export interface IMonthlyProrationTasker {
  processBatch(payload: MonthlyProrationBatchPayload): Promise<{ runId: string }>;
}

export type InvoiceNotificationPayload = {
  prorationId: string;
  invoiceId: string;
  teamId: number;
};

export interface IProrationInvoiceNotificationTasker {
  sendInvoiceCreatedNotification(payload: InvoiceNotificationPayload): Promise<{ runId: string }>;
  sendInvoiceReminderNotification(
    payload: InvoiceNotificationPayload,
    options?: { delay?: string }
  ): Promise<{ runId: string }>;
}
