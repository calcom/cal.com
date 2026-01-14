import { schemaTask, type TaskWithSchema } from "@trigger.dev/sdk";
import type { z } from "zod";

import { platformBillingTaskConfig } from "./config";
import { platformBillingTaskSchema } from "./schema";

export const INCREMENT_USAGE_JOB_ID = "platform.billing.increment-usage";

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
      await billingTaskService.incrementUsage(payload);
    },
  });
