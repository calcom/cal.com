import { schemaTask } from "@trigger.dev/sdk";

import { monthlyProrationTaskConfig } from "./config";
import { monthlyProrationBatchSchema } from "./schema";
import { sendProrationInvoiceEmail } from "./sendProrationInvoiceEmail";
import { sendProrationReminderEmail } from "./sendProrationReminderEmail";

const REMINDER_DELAY_DAYS = 7;

export const processMonthlyProrationBatch = schemaTask({
  id: "billing.monthly-proration.batch",
  ...monthlyProrationTaskConfig,
  schema: monthlyProrationBatchSchema,
  run: async (payload) => {
    const { getMonthlyProrationService } = await import(
      "@calcom/features/ee/billing/di/containers/MonthlyProrationService"
    );

    const prorationService = getMonthlyProrationService();

    const prorationResults = await prorationService.processMonthlyProrations({
      monthKey: payload.monthKey,
      teamIds: payload.teamIds,
    });

    for (const proration of prorationResults) {
      const isAutoCharge = proration.status === "INVOICE_CREATED";
      const isPending = proration.status === "PENDING";

      if (isAutoCharge || isPending) {
        await sendProrationInvoiceEmail.trigger({
          prorationId: proration.id,
          teamId: proration.teamId,
          isAutoCharge,
        });

        // Schedule reminder email for non-auto-charge invoices (7 days later)
        if (!isAutoCharge) {
          await sendProrationReminderEmail.trigger(
            {
              prorationId: proration.id,
              teamId: proration.teamId,
            },
            {
              delay: `${REMINDER_DELAY_DAYS}d`,
              idempotencyKey: `proration-reminder-${proration.id}`,
            }
          );
        }
      }
    }

    return prorationResults;
  },
});
