import { SleepSignal } from "@calid/job-dispatcher/src/adapter/bull";
import type { CalendlyImportJobData } from "@calid/job-engine";
import { type CalendarSyncJob, type DataSyncJob, type BookingExportJob } from "@calid/job-engine";
import { getRedisOptions, JobName, QueueName } from "@calid/queue";
import type { Job } from "bullmq";
import { Worker } from "bullmq";

import { processBookingExport } from "../processors/data-sync/bookingExport.processor";
import { processCalendarSync } from "../processors/data-sync/calendarSync.processor";
import { processCalendlyImport } from "../processors/data-sync/calendlyImport.processor";

export const DATA_SYNC_RATE_LIMITER = {
  max: 5,
  duration: 1000,
};

export const DATA_SYNC_WORKER_CONFIG = {
  concurrency: 2, // VERY LOW
  lockDuration: 10 * 60 * 1000, // 10 minutes
  maxStalledCount: 1,
  limiter: DATA_SYNC_RATE_LIMITER, // apply rate limiting
};

export const DATA_SYNC_WORKER_NAME = "data-sync-worker";

export const dataSyncWorker = new Worker<DataSyncJob>(
  QueueName.DATA_SYNC,
  async (job: Job<DataSyncJob>) => {
    try {
      const { name } = job;

      switch (name) {
        case JobName.CALENDAR_SYNC:
          await processCalendarSync(job as Job<CalendarSyncJob>);
          break;
        case JobName.BOOKING_EXPORT:
          await processBookingExport(job as Job<BookingExportJob>);
          break;
        case JobName.CALENDLY_IMPORT:
          await processCalendlyImport(job as Job<CalendlyImportJobData>);
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
    name: DATA_SYNC_WORKER_NAME,
    ...DATA_SYNC_WORKER_CONFIG,
  }
);

dataSyncWorker.on("ready", () => {
  console.log("🟢 Data sync worker is ready");
});

dataSyncWorker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

dataSyncWorker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} failed`, err);
});
