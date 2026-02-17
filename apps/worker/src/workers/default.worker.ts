import type { DefaultJob } from "@calid/job-engine";
import { getRedisOptions, JobName, QueueName } from "@calid/queue";
import { Worker } from "bullmq";

import { processRazorpayAppRevoked } from "../processors/default/razorpayAppRevoked.processor";
import { processRazorpayPaymentLinkPaid } from "../processors/default/razorpayPaymentLinkPaid.processor";

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
  QueueName.DEFAULT,
  async (job) => {
    try {
      const { name } = job;

      switch (job.name) {
        case JobName.RAZORPAY_APP_REVOKED:
          await processRazorpayAppRevoked(job);
          break;

        case JobName.RAZORPAY_PAYMENT_LINK_PAID:
          await processRazorpayPaymentLinkPaid(job);
          break;

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
