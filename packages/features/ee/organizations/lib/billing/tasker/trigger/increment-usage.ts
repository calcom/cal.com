import { ErrorWithCode } from "@calcom/lib/errors";
import { logger, schemaTask, type TaskWithSchema } from "@trigger.dev/sdk";
import type { z } from "zod";
import { INCREMENT_USAGE_JOB_ID } from "../constants";
import { platformBillingTaskConfig } from "./config";
import { platformBillingTaskSchema } from "./schema";

/**
 * Checks if an error is expected and should not trigger alerts.
 * Expected errors include:
 * - Subscriptions with "temp" or "sandbox" in the ID (test/placeholder subscriptions)
 * - Subscriptions that are not usage-based (this task only handles usage-based subscriptions)
 */
function isExpectedBillingError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();

  // Check for temp/sandbox subscription IDs in "No such subscription" errors
  if (message.includes("no such subscription")) {
    return message.includes("temp") || message.includes("sandbox");
  }

  // Check for non-usage-based subscription errors
  if (message.includes("is not usage based")) {
    return true;
  }

  return false;
}

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
        if (isExpectedBillingError(error)) {
          logger.info("Skipping expected billing error", { error: (error as Error).message });
          return;
        }

        if (error instanceof Error || error instanceof ErrorWithCode) logger.error(error.message);
        else logger.error("Unknown error in incrementUsage", { error });
        throw error;
      }
    },
  });
