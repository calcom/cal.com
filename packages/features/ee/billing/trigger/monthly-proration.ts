import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

const monthlyProrationSchema = z.object({
  monthKey: z.string().optional(),
});

export const processMonthlyProration = schemaTask({
  id: "billing.monthly-proration.process",
  schema: monthlyProrationSchema,
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

    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthKey =
      payload.monthKey ||
      `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, "0")}`;

    logger.info(`[MonthlyProration] starting proration processing for ${monthKey}`);

    const prorationService = new MonthlyProrationService();
    const results = await prorationService.processMonthlyProrations({ monthKey });

    logger.info(`[MonthlyProration] processed ${results.length} prorations for ${monthKey}`, {
      results: results.map((r) => ({
        prorationId: r.id,
        teamId: r.teamId,
        status: r.status,
        amount: r.proratedAmount,
      })),
    });

    return {
      monthKey,
      processedCount: results.length,
      results,
    };
  },
});
