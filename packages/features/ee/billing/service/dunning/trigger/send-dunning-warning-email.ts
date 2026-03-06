import { schemaTask, type TaskWithSchema } from "@trigger.dev/sdk";
import type { z } from "zod";
import { dunningEmailTaskConfig } from "./emailConfig";
import { sendDunningEmailSchema } from "./emailSchema";

export const SEND_DUNNING_WARNING_EMAIL_JOB_ID = "billing.send-dunning-warning-email";

export const sendDunningWarningEmail: TaskWithSchema<
  typeof SEND_DUNNING_WARNING_EMAIL_JOB_ID,
  typeof sendDunningEmailSchema
> = schemaTask({
  id: SEND_DUNNING_WARNING_EMAIL_JOB_ID,
  ...dunningEmailTaskConfig,
  schema: sendDunningEmailSchema,
  run: async (payload: z.infer<typeof sendDunningEmailSchema>) => {
    const { getDunningEmailService } = await import("@calcom/features/ee/billing/di/containers/Billing");
    const service = getDunningEmailService();
    await service.sendWarningEmail(payload.teamId);
  },
});
