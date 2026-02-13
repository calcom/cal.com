import { getRedisOptions, JobName, QueueName } from "@calid/queue";
import { type CalendarSyncJob, type DataSyncJob } from "@calid/queue/types";
import type { Job } from "bullmq";
import { Worker } from "bullmq";

import { processCalendarSync } from "../processors/calendarSync.processor";

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

export const dataSyncWorker = new Worker<DataSyncJob>(
  QueueName.DATA_SYNC,
  async (job: Job<DataSyncJob>) => {
    const { name } = job;

    switch (name) {
      case JobName.CALENDAR_SYNC:
        await processCalendarSync(job as Job<CalendarSyncJob>);
        break;
      case JobName.BOOKING_EXPORT:
        // await processBookingExport(job as Job<BookingExportJob>);
        break;
      case JobName.CALENDLY_IMPORT:
        // await processCalendlyImport(job as Job<CalendlyImportJob>);
        break;
      default:
        throw new Error(`No processor registered for job type ${name}`);
    }
  },
  {
    connection: getRedisOptions(),
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
