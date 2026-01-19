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

    const prorationService = getMonthlyProrationService();

    const { results, errors } = await prorationService.processMonthlyProrations({
      monthKey: payload.monthKey,
      teamIds: payload.teamIds,
    });

    // Re-queue failed teams individually for retry
    if (errors.length > 0 && payload.teamIds.length > 1) {
      // Only retry if this was a batch (not already a retry of single team)
      await processMonthlyProrationBatch.batchTrigger(
        errors.map(({ teamId }) => ({
          payload: {
            monthKey: payload.monthKey,
            teamIds: [teamId],
          },
        }))
      );
    }

    return {
      processedCount: results.length,
      failedCount: errors.length,
      retriedTeams: payload.teamIds.length > 1 ? errors.map((e) => e.teamId) : [],
    };
  },
});
