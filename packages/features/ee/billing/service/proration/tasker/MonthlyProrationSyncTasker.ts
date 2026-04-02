import { nanoid } from "nanoid";
import type { Logger } from "tslog";
import { MonthlyProrationService } from "../MonthlyProrationService";
import { ProrationEmailService } from "../ProrationEmailService";
import type { IMonthlyProrationTasker } from "./types";

export class MonthlyProrationSyncTasker implements IMonthlyProrationTasker {
  constructor(private readonly logger: Logger<unknown>) {}

  async processBatch(payload: Parameters<IMonthlyProrationTasker["processBatch"]>[0]) {
    const runId = `sync_${nanoid(10)}`;
    const prorationService = new MonthlyProrationService(this.logger);
    const prorationResults = await prorationService.processMonthlyProrations(payload);

    // Send invoice emails for eligible prorations
    const emailService = new ProrationEmailService();
    for (const proration of prorationResults) {
      const isAutoCharge = proration.status === "INVOICE_CREATED";
      const isPending = proration.status === "PENDING";

      if (isAutoCharge || isPending) {
        await emailService.sendInvoiceEmail({
          prorationId: proration.id,
          teamId: proration.teamId,
          isAutoCharge,
        });
        // Note: In sync mode, reminder emails are not scheduled
        // as they require Trigger.dev for delayed execution
      }
    }

    return { runId };
  }
}
