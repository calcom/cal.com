import { schemaTask } from "@trigger.dev/sdk";

import { monthlyProrationTaskConfig } from "./config";
import { monthlyProrationBatchSchema } from "./schema";

export const processMonthlyProrationBatch = schemaTask({
  id: "billing.monthly-proration.batch",
  ...monthlyProrationTaskConfig,
  schema: monthlyProrationBatchSchema,
  run: async (payload) => {
    const { getMonthlyProrationService } = await import(
      "@calcom/features/ee/billing/di/containers/MonthlyProrationService"
    );
    const { TriggerDevLogger } = await import("@calcom/lib/triggerDevLogger");
    const { prisma } = await import("@calcom/prisma");
    const { sendProrationInvoiceEmail } = await import("./sendProrationInvoiceEmail");

    const triggerDevLogger = new TriggerDevLogger();
    const log = triggerDevLogger.getSubLogger({
      name: "ProcessMonthlyProrationBatch",
    });

    const prorationService = getMonthlyProrationService();

    const results = await prorationService.processMonthlyProrations({
      monthKey: payload.monthKey,
      teamIds: payload.teamIds,
    });

    for (const proration of results) {
      if (proration && proration.proratedAmount > 0) {
        const team = await prisma.team.findUnique({
          where: { id: proration.teamId },
          select: { name: true },
        });

        if (team) {
          log.info(`Triggering invoice email for team ${proration.teamId}`, {
            prorationId: proration.id,
            proratedAmount: proration.proratedAmount,
          });

          await sendProrationInvoiceEmail.trigger({
            prorationId: proration.id,
            teamId: proration.teamId,
            teamName: team.name || `Team ${proration.teamId}`,
            monthKey: proration.monthKey,
            seatsAdded: proration.seatsAdded,
            remainingDays: proration.remainingDays,
            proratedAmount: proration.proratedAmount,
          });
        }
      }
    }

    return results;
  },
});
