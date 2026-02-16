import { getRedisOptions } from "@calid/queue";
import type { DefaultJob } from "@calid/job-engine/types";
import { Worker } from "bullmq";

export const DEFAULT_RATE_LIMITER = {
  max: 50,
  duration: 1000, // 50 jobs/sec max
};
export const DEFAULT_WORKER_CONFIG = {
  concurrency: 25, // high parallelism
  lockDuration: 30000, // 30s job lock
  maxStalledCount: 2, // retry stalled jobs twice
  limiter: DEFAULT_RATE_LIMITER, // apply rate limiting
};
export const DEFAULT_WORKER_NAME = "default-worker";
export const defaultWorker = new Worker<DefaultJob>(
  DEFAULT_WORKER_NAME,
  async (job) => {
    // await processCalendarSync(job);
  },
  {
    connection: getRedisOptions(),
    name: DEFAULT_WORKER_NAME,
    ...DEFAULT_WORKER_CONFIG,
  }
);

defaultWorker.on("ready", () => {
  console.log("🟢 Default worker is ready");
});

defaultWorker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

defaultWorker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} failed`, err);
});
