import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

const manualProrationSchema = z.object({
  monthKey: z.string(),
  teamIds: z.array(z.number()).optional(),
});

export const processMonthlyProrationManual = schemaTask({
  id: "billing.monthly-proration.process-manual",
  schema: manualProrationSchema,
  machine: "small-2x",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    randomize: true,
  },
  run: async (payload) => {
    const { TriggerDevLogger } = await import("@calcom/lib/triggerDevLogger");
    const { MonthlyProrationService } = await import("../service/proration/MonthlyProrationService");

    const logger = new TriggerDevLogger();

    logger.info(`[MonthlyProration:Manual] starting manual proration for ${payload.monthKey}`, {
      teamIds: payload.teamIds,
    });

    const prorationService = new MonthlyProrationService();
    const results = await prorationService.processMonthlyProrations({
      monthKey: payload.monthKey,
      teamIds: payload.teamIds,
    });

    logger.info(`[MonthlyProration:Manual] completed`, {
      processedCount: results.length,
    });

    return {
      monthKey: payload.monthKey,
      processedCount: results.length,
      results,
    };
  },
});
