import type { IProrationInvoiceNotificationTasker, InvoiceNotificationPayload } from "./types";

export class ProrationInvoiceNotificationTriggerTasker implements IProrationInvoiceNotificationTasker {
  async sendInvoiceCreatedNotification(payload: InvoiceNotificationPayload): Promise<{ runId: string }> {
    const { sendInvoiceCreatedNotification } = await import("./trigger/sendInvoiceCreatedNotification");
    const handle = await sendInvoiceCreatedNotification.trigger(payload);
    return { runId: handle.id };
  }

  async sendInvoiceReminderNotification(
    payload: InvoiceNotificationPayload,
    options?: { delay?: string }
  ): Promise<{ runId: string }> {
    const { sendInvoiceReminderNotification } = await import("./trigger/sendInvoiceReminderNotification");
    const handle = await sendInvoiceReminderNotification.trigger(payload, {
      delay: options?.delay,
    });
    return { runId: handle.id };
  }
}
