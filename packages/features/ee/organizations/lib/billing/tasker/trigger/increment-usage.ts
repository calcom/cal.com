import { schemaTask } from "@trigger.dev/sdk";
import type { z } from "zod";

import { platformBillingTaskConfig } from "./config";
import { platformBillingTaskSchema } from "./schema";

export const incrementUsage = schemaTask({
  id: "platform.billing.increment-usage",
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
