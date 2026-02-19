import { JobName, dispatcher } from "@calid/job-dispatcher";
import { QueueName } from "@calid/queue";

import dayjs from "@calcom/dayjs";
import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["[handleWebhookScheduledTriggers]"] });

export async function handleWebhookScheduledTriggers(prisma: PrismaClient) {
  log.info("Starting webhook scheduled triggers scan");

  // Purge stale triggers
  const deleteResult = await prisma.webhookScheduledTriggers.deleteMany({
    where: {
      startAfter: { lte: dayjs().subtract(1, "day").toDate() },
    },
  });

  if (deleteResult.count > 0) {
    log.info("Deleted stale webhook triggers", { count: deleteResult.count });
  }

  // Find jobs ready to schedule
  const jobsToRun = await prisma.webhookScheduledTriggers.findMany({
    where: {
      startAfter: {
        lte: dayjs().add(20, "minute").toISOString(),
        gte: dayjs().subtract(1, "day").toDate(),
      },
      scheduled: false,
    },
    select: {
      id: true,
      startAfter: true,
    },
  });

  log.info("Found webhook triggers to schedule", { count: jobsToRun.length });

  let scheduledJobs = 0;
  let failedJobs = 0;

  for (const job of jobsToRun) {
    const targetTime = job.startAfter.getTime();
    const delayMs = Math.max(0, targetTime - Date.now());

    log.info("Dispatching webhook trigger", {
      webhookId: job.id,
      targetTime: job.startAfter.toISOString(),
      delayMs,
    });

    try {
      await dispatcher.dispatch({
        queue: QueueName.SCHEDULED,
        name: JobName.WEBHOOK_SCHEDULED_TRIGGER,
        data: { id: job.id },
        inngestTs: targetTime,
        bullmqOptions: {
          delay: delayMs,
          attempts: 2,
          backoff: {
            type: "exponential",
            delay: 3000,
          },
          removeOnComplete: {
            count: 1000,
            age: 86400,
          },
          removeOnFail: {
            count: 5000,
          },
        },
      });

      await prisma.webhookScheduledTriggers.update({
        where: { id: job.id },
        data: { scheduled: true },
      });

      scheduledJobs++;
    } catch (error) {
      log.error("Failed to dispatch webhook trigger", {
        webhookId: job.id,
        error: error instanceof Error ? error.message : String(error),
      });
      failedJobs++;
    }
  }

  log.info("Webhook scheduled triggers scan completed", {
    total: jobsToRun.length,
    scheduled: scheduledJobs,
    failed: failedJobs,
  });

  return { scheduledJobs, failedJobs };
}
