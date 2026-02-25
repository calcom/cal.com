import { JobName, SleepSignal } from "@calid/job-dispatcher";
import type {
  ScheduledJob,
  WhatsAppReminderScheduledJobData,
  TriggerScheduledWebhookData,
} from "@calid/job-engine";
// import type { SyncWhatsappTemplatesData } from "@calid/job-engine/src/scheduled/type.js";
import { getRedisOptions, QueueName } from "@calid/queue";
import type { Job } from "bullmq";
import { Worker } from "bullmq";

// import { syncWhatsappTemplatesProcessor } from "../processors/scheduled/syncWhatsappTemplates.processor.js";
import { triggerScheduledWebhookProcessor } from "../processors/scheduled/triggerScheduledWebhook.processor.ts";
import { processWhatsappReminderScheduled } from "../processors/scheduled/whatsappReminderScheduled.processor.js";
import { resolveJobName } from "../utils/resolveJobName";

export const SCHEDULED_WORKER_NAME = "scheduled-worker";

export const SCHEDULED_RATE_LIMITER = {
  max: 50, // Max 50 jobs per...
  duration: 1000, // ...1 second (rate limiting)
};

export const SCHEDULED_WORKER_CONFIG = {
  concurrency: 10,
  lockDuration: 60 * 1000, // 1 min
  maxStalledCount: 3,
  limiter: SCHEDULED_RATE_LIMITER, // apply rate limiting
};

export const scheduledWorker = new Worker<ScheduledJob>(
  QueueName.SCHEDULED,
  async (job) => {
    try {
      const name = resolveJobName(job);

      switch (job.name) {
        case JobName.WEBHOOK_SCHEDULED_TRIGGER:
          await triggerScheduledWebhookProcessor(job as Job<TriggerScheduledWebhookData>);
          break;

        case JobName.WHATSAPP_REMINDER_SCHEDULED:
          await processWhatsappReminderScheduled(job as Job<WhatsAppReminderScheduledJobData>);
          break;

        // case JobName.WHATSAPP_TEMPLATE_SYNC:
        //   return syncWhatsappTemplatesProcessor(job as Job<SyncWhatsappTemplatesData>);

        default:
          throw new Error(`No processor registered for job type ${name}`);
      }
    } catch (error) {
      // Sleep signal is not an error - it's expected workflow behavior
      if (error instanceof SleepSignal) {
        console.log(`Job ${job.id} sleeping for ${error.duration}ms`);
        return; // Success - job will resume after delay
      }

      // Real error - rethrow for retry logic
      throw error;
    }
  },
  {
    connection: getRedisOptions(),
    name: SCHEDULED_WORKER_NAME,
    ...SCHEDULED_WORKER_CONFIG,
  }
);

scheduledWorker.on("ready", () => {
  console.log("🟢 Scheduled worker is ready");
});

scheduledWorker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

scheduledWorker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} failed`, err);
});
