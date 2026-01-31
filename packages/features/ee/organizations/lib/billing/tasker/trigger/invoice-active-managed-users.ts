import { ErrorWithCode } from "@calcom/lib/errors";
import { logger, schemaTask, type TaskWithSchema } from "@trigger.dev/sdk";
import type { z } from "zod";
import { INVOICE_ACTIVE_MANAGED_USERS_JOB_ID } from "../constants";
import { platformBillingTaskConfig } from "./config";
import { invoiceActiveManagedUsersTaskSchema } from "./schema";

export const invoiceActiveManagedUsers: TaskWithSchema<
  typeof INVOICE_ACTIVE_MANAGED_USERS_JOB_ID,
  typeof invoiceActiveManagedUsersTaskSchema
> = schemaTask({
  id: INVOICE_ACTIVE_MANAGED_USERS_JOB_ID,
  ...platformBillingTaskConfig,
  schema: invoiceActiveManagedUsersTaskSchema,
  run: async (payload: z.infer<typeof invoiceActiveManagedUsersTaskSchema>) => {
    const { getPlatformOrganizationBillingTaskService } = await import(
      "@calcom/features/ee/organizations/di/tasker/PlatformOrganizationBillingTaskService.container"
    );

    const billingTaskService = getPlatformOrganizationBillingTaskService();
    try {
      await billingTaskService.invoiceActiveManagedUsers(payload);
    } catch (error) {
      if (error instanceof Error || error instanceof ErrorWithCode) logger.error(error.message);
      else logger.error("Unknown error in invoiceActiveManagedUsers", { error });
      throw error;
    }
  },
});
