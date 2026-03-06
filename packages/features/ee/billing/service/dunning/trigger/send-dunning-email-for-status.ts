import { schemaTask, type TaskWithSchema } from "@trigger.dev/sdk";
import { z } from "zod";
import { dunningEmailTaskConfig } from "./emailConfig";

const sendDunningEmailForStatusSchema = z.object({
  teamId: z.number().int().positive(),
  status: z.enum(["WARNING", "SOFT_BLOCKED", "HARD_BLOCKED", "CANCELLED"]),
});

export const SEND_DUNNING_EMAIL_FOR_STATUS_JOB_ID = "billing.send-dunning-email-for-status";

export const sendDunningEmailForStatus: TaskWithSchema<
  typeof SEND_DUNNING_EMAIL_FOR_STATUS_JOB_ID,
  typeof sendDunningEmailForStatusSchema
> = schemaTask({
  id: SEND_DUNNING_EMAIL_FOR_STATUS_JOB_ID,
  ...dunningEmailTaskConfig,
  schema: sendDunningEmailForStatusSchema,
  run: async (payload: z.infer<typeof sendDunningEmailForStatusSchema>) => {
    const { getDunningEmailService } = await import("@calcom/features/ee/billing/di/containers/Billing");
    const service = getDunningEmailService();

    switch (payload.status) {
      case "WARNING":
        await service.sendWarningEmail(payload.teamId);
        break;
      case "SOFT_BLOCKED":
        await service.sendSoftBlockEmail(payload.teamId);
        break;
      case "HARD_BLOCKED":
        await service.sendPauseEmail(payload.teamId);
        break;
      case "CANCELLED":
        await service.sendCancellationEmail(payload.teamId);
        break;
    }
  },
});
