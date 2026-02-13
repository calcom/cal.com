import { QueueName, getRedisOptions } from "@calid/queue";
import type { ScheduledJob } from "@calid/queue/types";
import { Worker } from "bullmq";

export const SCHEDULED_WORKER_NAME = "scheduled-worker";

export const SCHEDULED_RATE_LIMITER = {
  max: 20,
  duration: 1000,
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
    // await processCalendarSync(job);
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
