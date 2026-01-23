import { nanoid } from "nanoid";

import stripe from "@calcom/features/ee/payments/server/stripe";

import { StripeBillingService } from "../../billingProvider/StripeBillingService";
import { ProrationInvoiceNotificationService } from "../ProrationInvoiceNotificationService";
import type { IProrationInvoiceNotificationTasker, InvoiceNotificationPayload } from "./types";

export class ProrationInvoiceNotificationSyncTasker implements IProrationInvoiceNotificationTasker {
  async sendInvoiceCreatedNotification(payload: InvoiceNotificationPayload): Promise<{ runId: string }> {
    const runId = `sync_created_${nanoid(10)}`;
    const billingService = new StripeBillingService(stripe);
    const notificationService = new ProrationInvoiceNotificationService({ billingService });
    await notificationService.sendInvoiceCreatedNotification(payload);
    return { runId };
  }

  async sendInvoiceReminderNotification(
    _payload: InvoiceNotificationPayload,
    _options?: { delay?: string }
  ): Promise<{ runId: string }> {
    // Sync tasker does not support delayed tasks - skip reminder notifications
    // Reminders are only sent via the async (Trigger.dev) tasker
    return { runId: "" };
  }
}
