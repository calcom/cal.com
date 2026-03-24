import { schemaTask, type TaskWithSchema } from "@trigger.dev/sdk";
import type { z } from "zod";
import { dunningTaskConfig } from "./config";
import { advanceSingleTeamDunningSchema } from "./schema";

export const ADVANCE_SINGLE_TEAM_DUNNING_JOB_ID = "billing.advance-single-team-dunning";

export const advanceSingleTeamDunning: TaskWithSchema<
  typeof ADVANCE_SINGLE_TEAM_DUNNING_JOB_ID,
  typeof advanceSingleTeamDunningSchema
> = schemaTask({
  id: ADVANCE_SINGLE_TEAM_DUNNING_JOB_ID,
  ...dunningTaskConfig,
  schema: advanceSingleTeamDunningSchema,
  run: async (payload: z.infer<typeof advanceSingleTeamDunningSchema>) => {
    const { getDunningServiceFactory } = await import(
      "@calcom/features/ee/billing/di/containers/Billing"
    );
    const { shouldSkipDunningAdvancement } = await import("../shouldSkipDunningAdvancement");

    const factory = getDunningServiceFactory();

    const [teamId, planName, currentStatus] = await Promise.all([
      factory.findTeamIdByBillingId(payload.billingId, payload.entityType),
      factory.findPlanNameByBillingId(payload.billingId, payload.entityType),
      factory.getDunningStatus(payload.billingId, payload.entityType),
    ]);

    if (shouldSkipDunningAdvancement(planName, currentStatus)) {
      return { advanced: false, skipped: true, reason: "enterprise" };
    }

    const result = await factory.advanceByBillingId(payload.billingId, payload.entityType);

    if (result.advanced && result.to && teamId) {
      if (result.to === "SOFT_BLOCKED") {
        const { sendDunningSoftBlockEmail } = await import("./send-dunning-soft-block-email");
        await sendDunningSoftBlockEmail.trigger({ teamId });
      } else if (result.to === "HARD_BLOCKED") {
        const { sendDunningPauseEmail } = await import("./send-dunning-pause-email");
        await sendDunningPauseEmail.trigger({ teamId });
      } else if (result.to === "CANCELLED") {
        const { sendDunningCancellationEmail } = await import("./send-dunning-cancellation-email");
        await sendDunningCancellationEmail.trigger({ teamId });
      }
    }

    return result;
  },
});
