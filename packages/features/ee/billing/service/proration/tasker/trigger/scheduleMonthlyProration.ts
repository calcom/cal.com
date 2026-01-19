import { schedules } from "@trigger.dev/sdk";

import { monthlyProrationTaskConfig } from "./config";

export const scheduleMonthlyProration = schedules.task({
  id: "billing.monthly-proration.schedule",
  ...monthlyProrationTaskConfig,
  cron: {
    pattern: "0 0 1 * *",
    timezone: "UTC",
  },
  run: async () => {
    const { subMonths } = await import("date-fns");
    const { TriggerDevLogger } = await import("@calcom/lib/triggerDevLogger");
    const { formatMonthKey } = await import("@calcom/features/ee/billing/lib/month-key");
    const { MonthlyProrationTeamRepository } = await import(
      "@calcom/features/ee/billing/repository/proration/MonthlyProrationTeamRepository"
    );
    const { getFeaturesRepository } = await import("@calcom/features/di/containers/FeaturesRepository");
    const { MONTHLY_PRORATION_BATCH_SIZE } = await import("../constants");
    const { processMonthlyProrationBatch } = await import("./processMonthlyProrationBatch");

    const triggerDevLogger = new TriggerDevLogger();
    const log = triggerDevLogger.getSubLogger({ name: "MonthlyProrationSchedule" });

    const featuresRepository = getFeaturesRepository();
    const isEnabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("monthly-proration");

    if (!isEnabled) {
      log.info("Monthly proration feature is disabled");
      return { status: "disabled" };
    }

    const now = new Date();
    const startOfCurrentMonthUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const previousMonthUtc = subMonths(startOfCurrentMonthUtc, 1);
    const monthKey = formatMonthKey(previousMonthUtc);

    log.info(`Scheduling monthly proration tasks for ${monthKey}`);

    const teamRepository = new MonthlyProrationTeamRepository();
    const teamIdsList = await teamRepository.getAnnualTeamsWithSeatChanges(monthKey);

    if (teamIdsList.length === 0) {
      log.info(`No teams with seat changes found for ${monthKey}`);
      return {
        monthKey,
        scheduledTeams: 0,
        scheduledBatches: 0,
        batchSize: MONTHLY_PRORATION_BATCH_SIZE,
      };
    }

    const batches: number[][] = [];
    for (let index = 0; index < teamIdsList.length; index += MONTHLY_PRORATION_BATCH_SIZE) {
      batches.push(teamIdsList.slice(index, index + MONTHLY_PRORATION_BATCH_SIZE));
    }

    log.info(`Scheduling ${teamIdsList.length} teams in ${batches.length} batches for ${monthKey}`);

    await Promise.all(
      batches.map((teamIds) =>
        processMonthlyProrationBatch.trigger({
          monthKey,
          teamIds,
        })
      )
    );

    return {
      monthKey,
      scheduledTeams: teamIdsList.length,
      scheduledBatches: batches.length,
      batchSize: MONTHLY_PRORATION_BATCH_SIZE,
    };
  },
});
