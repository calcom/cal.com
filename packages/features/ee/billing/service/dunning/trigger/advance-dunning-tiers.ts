import { schedules } from "@trigger.dev/sdk";

import { advanceSingleTeamDunning } from "./advance-single-team-dunning";
import { dunningTaskConfig } from "./config";

export const advanceDunningTiersTask = schedules.task({
  id: "billing.advance-dunning-tiers",
  ...dunningTaskConfig,
  cron: {
    pattern: "0 0 * * *",
    timezone: "UTC",
  },
  run: async () => {
    const { getDunningServiceFactory } = await import("@calcom/features/ee/billing/di/containers/Billing");
    const factory = getDunningServiceFactory();

    const candidates = await factory.getAdvancementCandidates();

    if (candidates.length === 0) {
      return { total: 0, succeeded: 0, failed: 0 };
    }

    const results = await advanceSingleTeamDunning.batchTriggerAndWait(
      candidates.map(({ billingId, entityType }) => ({
        payload: { billingId, entityType },
      }))
    );

    const succeeded = results.runs.filter((run) => run.ok);
    const failed = results.runs.filter((run) => !run.ok);

    return {
      total: candidates.length,
      succeeded: succeeded.length,
      failed: failed.length,
    };
  },
});
