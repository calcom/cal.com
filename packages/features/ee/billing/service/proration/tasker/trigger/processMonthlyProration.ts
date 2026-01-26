import { schemaTask } from "@trigger.dev/sdk";

import { monthlyProrationTaskConfig } from "./config";
import { monthlyProrationBatchSchema } from "./schema";

export const processMonthlyProrationProcess = schemaTask({
  id: "billing.monthly-proration.process",
  ...monthlyProrationTaskConfig,
  schema: monthlyProrationBatchSchema,
  run: async (payload) => {
    const { getMonthlyProrationService } = await import(
      "@calcom/features/ee/billing/di/containers/MonthlyProrationService"
    );

    const prorationService = getMonthlyProrationService();

    return await prorationService.processMonthlyProrations({
      monthKey: payload.monthKey,
      teamIds: payload.teamIds,
    });
  },
});
