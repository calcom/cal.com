import { ErrorWithCode } from "@calcom/lib/errors";
import { logger, schemaTask, type TaskWithSchema } from "@trigger.dev/sdk";
import type { z } from "zod";
import { INCREMENT_USAGE_JOB_ID } from "../constants";
import { platformBillingTaskConfig } from "./config";
import { platformBillingTaskSchema } from "./schema";

export const incrementUsage: TaskWithSchema<typeof INCREMENT_USAGE_JOB_ID, typeof platformBillingTaskSchema> =
  schemaTask({
    id: INCREMENT_USAGE_JOB_ID,
    ...platformBillingTaskConfig,
    schema: platformBillingTaskSchema,
    run: async (payload: z.infer<typeof platformBillingTaskSchema>) => {
      const { getPlatformOrganizationBillingTaskService } = await import(
        "@calcom/features/ee/organizations/di/tasker/PlatformOrganizationBillingTaskService.container"
      );

      const billingTaskService = getPlatformOrganizationBillingTaskService();
      try {
        await billingTaskService.incrementUsage(payload);
      } catch (error) {
        if (error instanceof Error || error instanceof ErrorWithCode) logger.error(error.message);
        else logger.error("Unknown error in incrementUsage", { error });
        throw error;
      }
    },
  });
