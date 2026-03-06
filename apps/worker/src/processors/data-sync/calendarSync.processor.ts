import { dispatcher, JobName } from "@calid/job-dispatcher";
import {
  disableCalendarSync,
  runDeltaCalendarSync,
  runInitialCalendarSync,
  runSubscriptionRenewalCron,
} from "@calid/job-engine";
import type { CalendarSyncJobData } from "@calid/job-engine";
import type { Job } from "bullmq";
import { QueueName } from "packages/queue/src";

const sanitizeKeyPart = (value: string): string => value.replace(/[^a-zA-Z0-9_-]/g, "_");

export async function processCalendarSync(job: Job<CalendarSyncJobData>) {
  const { calendarId, reason, action, disableReason, syncDisabledReason } = job.data;

  if (action === "renewSubscription") {
    job.log("Starting calendar subscription renewal cron job");
    const renewalStats = await runSubscriptionRenewalCron();
    if (renewalStats.autoDisableTargets.length > 0) {
      for (const target of renewalStats.autoDisableTargets) {
        const provider = target.provider.toLowerCase() as "google" | "outlook";
        const providerCalendarId = sanitizeKeyPart(target.providerCalendarId);
        const payload: CalendarSyncJobData = {
          name: JobName.CALENDAR_SYNC,
          action: "disableCalendarSync",
          calendarId: target.calendarId,
          provider,
          credentialId: target.credentialId,
          providerCalendarId: target.providerCalendarId,
          reason: "manual",
          disableReason: "system",
          syncDisabledReason: "SUBSCRIPTION_RENEWAL_FAILED",
        };

        await dispatcher.dispatch({
          queue: QueueName.DATA_SYNC,
          name: JobName.CALENDAR_SYNC,
          data: payload,
          bullmqOptions: {
            jobId: `disable:${provider}:${target.credentialId}:${providerCalendarId}:${target.calendarId}`,
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 2000,
            },
            removeOnComplete: {
              age: 3600,
              count: 1000,
            },
            removeOnFail: {
              age: 86400,
              count: 2000,
            },
          },
        });

        job.log(
          `Queued disable sync job for calendarId=${target.calendarId}, provider=${provider}, reason=SUBSCRIPTION_RENEWAL_FAILED`
        );
      }
    }
    job.log("Calendar subscription renewal cron job completed");
    return;
  }

  if (action === "disableCalendarSync") {
    if (typeof calendarId !== "number" || !Number.isFinite(calendarId)) {
      job.log("Skipping disable calendar sync due to invalid calendarId");
      return;
    }
    job.log(`Starting disable calendar sync for calendarId=${calendarId}`);
    await disableCalendarSync(calendarId, {
      reason: disableReason ?? "system",
      syncDisabledReason,
    });
    job.log(`Disable calendar sync completed for calendarId=${calendarId}`);
    return;
  }

  if (typeof calendarId === "number" && Number.isFinite(calendarId)) {
    const effectiveReason = reason ?? "webhook";
    job.log(
      `Starting calendar sync for calendarId=${calendarId}, action=${action}, reason=${effectiveReason}`
    );

    if (action === "initialSync") {
      await runInitialCalendarSync(calendarId);
    } else {
      await runDeltaCalendarSync(calendarId);
    }

    job.log(`Sync completed for calendarId=${calendarId}`);
    return;
  }

  // // Legacy fallback path.
  // job.log(`Starting legacy ${syncType} sync for ${provider}`);
  // if (provider === "google" && userId !== undefined) {
  //   await handleGoogleCalendarSync(Number(userId));
  // }
  job.log("Legacy sync completed");
}
