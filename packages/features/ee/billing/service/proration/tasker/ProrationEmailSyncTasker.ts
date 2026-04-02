import { nanoid } from "nanoid";
import type { Logger } from "tslog";
import type { IProrationEmailTasker } from "./types";

export class ProrationEmailSyncTasker implements IProrationEmailTasker {
  constructor(private readonly logger: Logger<unknown>) {}

  async sendInvoiceEmail(payload: Parameters<IProrationEmailTasker["sendInvoiceEmail"]>[0]) {
    const runId = `sync_${nanoid(10)}`;
    this.logger.info(`[ProrationEmailSyncTasker] sendInvoiceEmail runId=${runId}`);
    const { ProrationEmailService } = await import("../ProrationEmailService");
    const emailService = new ProrationEmailService();
    await emailService.sendInvoiceEmail(payload);
    return { runId };
  }

  async sendReminderEmail(payload: Parameters<IProrationEmailTasker["sendReminderEmail"]>[0]) {
    const runId = `sync_${nanoid(10)}`;
    this.logger.info(`[ProrationEmailSyncTasker] sendReminderEmail runId=${runId}`);
    const { ProrationEmailService } = await import("../ProrationEmailService");
    const emailService = new ProrationEmailService();
    await emailService.sendReminderEmail(payload);
    return { runId };
  }

  async cancelReminder(payload: Parameters<IProrationEmailTasker["cancelReminder"]>[0]) {
    const runId = `sync_${nanoid(10)}`;
    // In sync mode, reminders are not scheduled (they require Trigger.dev)
    // so cancellation is a no-op
    this.logger.info(`[ProrationEmailSyncTasker] cancelReminder runId=${runId} - no-op in sync mode`, {
      prorationId: payload.prorationId,
    });
    return { runId };
  }
}
