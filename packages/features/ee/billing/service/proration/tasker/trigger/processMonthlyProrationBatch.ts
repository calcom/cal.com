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

    await prorationService.processMonthlyProrations({
      monthKey: payload.monthKey,
      teamIds: payload.teamIds,
    });
  },
});
