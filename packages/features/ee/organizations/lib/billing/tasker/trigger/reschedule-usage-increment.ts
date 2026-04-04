import { logger, runs, schemaTask, type TaskWithSchema } from "@trigger.dev/sdk";
import type z from "zod";
import { getIncrementUsageJobTag, RESCHEDULE_USAGE_INCREMENT_JOB_ID } from "../constants";
import { platformBillingTaskConfig } from "./config";
import { platformBillingRescheduleUsageIncrementTaskSchema } from "./schema";

export const rescheduleUsageIncrement: TaskWithSchema<
  typeof RESCHEDULE_USAGE_INCREMENT_JOB_ID,
  typeof platformBillingRescheduleUsageIncrementTaskSchema
> = schemaTask({
  id: RESCHEDULE_USAGE_INCREMENT_JOB_ID,
  ...platformBillingTaskConfig,
  schema: platformBillingRescheduleUsageIncrementTaskSchema,
  run: async (payload: z.infer<typeof platformBillingRescheduleUsageIncrementTaskSchema>) => {
    const runId: string = (
      await runs.list({
        tag: getIncrementUsageJobTag(payload.bookingUid),
        limit: 1,
      })
    )?.data?.[0]?.id;

    if (!runId) {
      logger.info("No run found for booking uid", { bookingUid: payload.bookingUid });
      return;
    }

    await runs.reschedule(runId, { delay: payload.rescheduledTime });
  },
});
