import { schemaTask } from "@trigger.dev/sdk";

import { monthlyProrationTaskConfig } from "./config";
import { monthlyProrationBatchSchema } from "./schema";

export const processMonthlyProrationBatch = schemaTask({
  id: "billing.monthly-proration.batch",
  ...monthlyProrationTaskConfig,
  schema: monthlyProrationBatchSchema,
  run: async (payload) => {
    const { TriggerDevLogger } = await import("@calcom/lib/triggerDevLogger");
    const { MonthlyProrationService } = await import("../../MonthlyProrationService");

    const triggerDevLogger = new TriggerDevLogger();
    const taskLogger = triggerDevLogger.getSubLogger({ name: "MonthlyProrationTask" });
    const prorationService = new MonthlyProrationService(taskLogger);

    await prorationService.processMonthlyProrations({
      monthKey: payload.monthKey,
      teamIds: payload.teamIds,
    });
  },
});
