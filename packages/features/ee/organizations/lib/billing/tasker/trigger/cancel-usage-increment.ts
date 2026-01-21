import { logger, runs, schemaTask, type TaskWithSchema } from "@trigger.dev/sdk";
import type { z } from "zod";

import { platformBillingTaskConfig } from "./config";
import { platformBillingCancelUsageIncrementTaskSchema } from "./schema";

export const CANCEL_USAGE_INCREMENT_JOB_ID = "platform.billing.cancel-usage-increment";

export const cancelUsageIncrement: TaskWithSchema<
  typeof CANCEL_USAGE_INCREMENT_JOB_ID,
  typeof platformBillingCancelUsageIncrementTaskSchema
> = schemaTask({
  id: CANCEL_USAGE_INCREMENT_JOB_ID,
  ...platformBillingTaskConfig,
  schema: platformBillingCancelUsageIncrementTaskSchema,
  run: async (payload: z.infer<typeof platformBillingCancelUsageIncrementTaskSchema>) => {
    const runId: string = (
      await runs.list({
        tag: `increment-${payload.bookingUid}`,
        limit: 1,
      })
    )?.data?.[0]?.id;

    if (!runId) {
      logger.info("No run found for booking uid", { bookingUid: payload.bookingUid });
      return;
    }

    await runs.cancel(runId);
  },
});
