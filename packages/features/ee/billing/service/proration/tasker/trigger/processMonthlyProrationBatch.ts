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

    const emailPayloads: {
      payload: {
        prorationId: string;
        teamId: number;
        teamName: string;
        monthKey: string;
        seatsAdded: number;
        remainingDays: number;
        proratedAmount: number;
      };
    }[] = [];

    const teamIds = results
      .filter((proration) => proration && proration.proratedAmount > 0)
      .map((proration) => proration.teamId);

    if (teamIds.length > 0) {
      const teams = await prisma.team.findMany({
        where: { id: { in: teamIds } },
        select: { id: true, name: true },
      });

      const teamMap = new Map(teams.map((team) => [team.id, team.name]));

      for (const proration of results) {
        if (proration && proration.proratedAmount > 0) {
          const teamName = teamMap.get(proration.teamId);
          if (teamName !== undefined) {
            emailPayloads.push({
              payload: {
                prorationId: proration.id,
                teamId: proration.teamId,
                teamName: teamName || `Team ${proration.teamId}`,
                monthKey: proration.monthKey,
                seatsAdded: proration.seatsAdded,
                remainingDays: proration.remainingDays,
                proratedAmount: proration.proratedAmount,
              },
            });
          }
        }
      }
    }

    if (emailPayloads.length > 0) {
      log.info(`Triggering ${emailPayloads.length} invoice emails via batchTrigger`);
      await sendProrationInvoiceEmail.batchTrigger(emailPayloads);
    }

    return results;
  },
});
