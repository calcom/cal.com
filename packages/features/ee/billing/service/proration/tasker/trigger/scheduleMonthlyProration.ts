import { schedules } from "@trigger.dev/sdk";

import { monthlyProrationTaskConfig } from "./config";
import { processMonthlyProrationBatch } from "./processMonthlyProrationBatch";

export const scheduleMonthlyProration = schedules.task({
  id: "billing.monthly-proration.schedule",
  ...monthlyProrationTaskConfig,
  cron: {
    pattern: "0 0 1 * *",
    timezone: "UTC",
  },
  run: async (payload) => {
    const { subMonths } = await import("date-fns");
    const { TriggerDevLogger } = await import("@calcom/lib/triggerDevLogger");
    const { formatMonthKey, isValidMonthKey } = await import("@calcom/features/ee/billing/lib/month-key");
    const { MonthlyProrationTeamRepository } = await import(
      "@calcom/features/ee/billing/repository/proration/MonthlyProrationTeamRepository"
    );
    const { getFeaturesRepository } = await import("@calcom/features/di/containers/FeaturesRepository");
    const triggerDevLogger = new TriggerDevLogger();
    const log = triggerDevLogger.getSubLogger({
      name: "MonthlyProrationSchedule",
    });

    const featuresRepository = getFeaturesRepository();
    const isEnabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("monthly-proration");

    if (!isEnabled) {
      log.info("Monthly proration feature is disabled");
      return { status: "disabled" };
    }

    const externalIdMonthKey =
      payload.externalId && isValidMonthKey(payload.externalId) ? payload.externalId : null;

    let monthKey: string;
    if (externalIdMonthKey) {
      monthKey = externalIdMonthKey;
      log.info(`Using monthKey from externalId: ${monthKey}`);
    } else {
      const now = new Date();
      const startOfCurrentMonthUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const previousMonthUtc = subMonths(startOfCurrentMonthUtc, 1);
      monthKey = formatMonthKey(previousMonthUtc);
    }

    log.info(`Starting monthly proration for ${monthKey}`);

    const teamRepository = new MonthlyProrationTeamRepository();
    const teamIdsList = await teamRepository.getAnnualTeamsWithSeatChanges(monthKey);

    if (teamIdsList.length === 0) {
      log.info(`No teams with seat changes found for ${monthKey}`);
      return {
        monthKey,
        scheduledTasks: 0,
      };
    }

    log.info(`Processing ${teamIdsList.length} teams for ${monthKey}`);

    const results = await processMonthlyProrationBatch.batchTriggerAndWait(
      teamIdsList.map((teamId) => ({
        payload: {
          monthKey,
          teamIds: [teamId],
        },
      }))
    );

    const succeeded = results.runs.filter((run) => run.ok);
    const failed = results.runs.filter((run) => !run.ok);

    if (failed.length > 0) {
      log.warn(`${failed.length} proration tasks failed`, {
        failedRunIds: failed.map((run) => run.id),
      });
    }

    log.info(`Monthly proration completed for ${monthKey}`, {
      total: teamIdsList.length,
      succeeded: succeeded.length,
      failed: failed.length,
    });

    return {
      monthKey,
      totalTeams: teamIdsList.length,
      succeeded: succeeded.length,
      failed: failed.length,
    };
  },
});
