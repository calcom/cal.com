export type MonthlyProrationBatchPayload = {
  monthKey: string;
  teamIds: number[];
};

export interface IMonthlyProrationTasker {
  processBatch(payload: MonthlyProrationBatchPayload): Promise<{ runId: string }>;
}

export interface SendInvoiceEmailPayload {
  prorationId: string;
  teamId: number;
  isAutoCharge: boolean;
}

export interface SendReminderEmailPayload {
  prorationId: string;
  teamId: number;
}

export interface CancelReminderPayload {
  prorationId: string;
}

export interface IProrationEmailTasker {
  sendInvoiceEmail(payload: SendInvoiceEmailPayload): Promise<{ runId: string }>;
  sendReminderEmail(payload: SendReminderEmailPayload): Promise<{ runId: string }>;
  cancelReminder(payload: CancelReminderPayload): Promise<{ runId: string }>;
}
