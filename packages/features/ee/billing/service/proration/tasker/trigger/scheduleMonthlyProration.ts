import { schedules } from "@trigger.dev/sdk";

import { monthlyProrationTaskConfig } from "./config";

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
    const { formatMonthKey, isValidMonthKey } = await import(
      "@calcom/features/ee/billing/lib/month-key"
    );
    const { MonthlyProrationTeamRepository } = await import(
      "@calcom/features/ee/billing/repository/proration/MonthlyProrationTeamRepository"
    );
    const { getFeaturesRepository } = await import(
      "@calcom/features/di/containers/FeaturesRepository"
    );
    const { processMonthlyProrationBatch } = await import(
      "./processMonthlyProrationBatch"
    );

    const triggerDevLogger = new TriggerDevLogger();
    const log = triggerDevLogger.getSubLogger({
      name: "MonthlyProrationSchedule",
    });

    const featuresRepository = getFeaturesRepository();
    const isEnabled = await featuresRepository.checkIfFeatureIsEnabledGlobally(
      "monthly-proration"
    );

    if (!isEnabled) {
      log.info("Monthly proration feature is disabled");
      return { status: "disabled" };
    }

    const externalIdMonthKey =
      payload.externalId && isValidMonthKey(payload.externalId)
        ? payload.externalId
        : null;

    let monthKey: string;
    if (externalIdMonthKey) {
      monthKey = externalIdMonthKey;
      log.info(`Using monthKey from externalId: ${monthKey}`);
    } else {
      const now = new Date();
      const startOfCurrentMonthUtc = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
      );
      const previousMonthUtc = subMonths(startOfCurrentMonthUtc, 1);
      monthKey = formatMonthKey(previousMonthUtc);
    }

    log.info(`Scheduling monthly proration tasks for ${monthKey}`);

    const teamRepository = new MonthlyProrationTeamRepository();
    const teamIdsList = await teamRepository.getAnnualTeamsWithSeatChanges(
      monthKey
    );

    if (teamIdsList.length === 0) {
      log.info(`No teams with seat changes found for ${monthKey}`);
      return {
        monthKey,
        scheduledTasks: 0,
      };
    }

    log.info(`Scheduling ${teamIdsList.length} tasks for ${monthKey}`);

    await processMonthlyProrationBatch.batchTrigger(
      teamIdsList.map((teamId) => ({
        payload: {
          monthKey,
          teamIds: [teamId],
        },
      }))
    );

    return {
      monthKey,
      scheduledTasks: teamIdsList.length,
    };
  },
});
