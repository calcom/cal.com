import { ErrorWithCode } from "@calcom/lib/errors";
import { logger, schemaTask, type TaskWithSchema } from "@trigger.dev/sdk";
import type { z } from "zod";
import { COUNT_ACTIVE_MANAGED_USERS_JOB_ID } from "../constants";
import { platformBillingTaskConfig } from "./config";
import { countActiveManagedUsersTaskSchema } from "./schema";

export const countActiveManagedUsers: TaskWithSchema<
  typeof COUNT_ACTIVE_MANAGED_USERS_JOB_ID,
  typeof countActiveManagedUsersTaskSchema
> = schemaTask({
  id: COUNT_ACTIVE_MANAGED_USERS_JOB_ID,
  ...platformBillingTaskConfig,
  schema: countActiveManagedUsersTaskSchema,
  run: async (payload: z.infer<typeof countActiveManagedUsersTaskSchema>) => {
    const { getPlatformOrganizationBillingTaskService } = await import(
      "@calcom/features/ee/organizations/di/tasker/PlatformOrganizationBillingTaskService.container"
    );

    const billingTaskService = getPlatformOrganizationBillingTaskService();
    try {
      await billingTaskService.countActiveManagedUsers(payload);
    } catch (error) {
      if (error instanceof Error || error instanceof ErrorWithCode) logger.error(error.message);
      else logger.error("Unknown error in countActiveManagedUsers", { error });
      throw error;
    }
  },
});
