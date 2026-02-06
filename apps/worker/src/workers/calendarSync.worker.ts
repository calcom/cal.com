import { CALENDAR_SYNC_QUEUE } from "@calid/queue";
import { redisConnection } from "@calid/queue";
import type { CalendarSyncJob } from "@calid/queue/types";
import { Worker } from "bullmq";

import { processCalendarSync } from "../processors/calendarSync.processor";

export const calendarSyncWorker = new Worker<CalendarSyncJob>(
  CALENDAR_SYNC_QUEUE,
  async (job) => {
    await processCalendarSync(job);
  },
  {
    connection: redisConnection,
    concurrency: 5,
    lockDuration: 10 * 60 * 1000, // 10 min
  }
);

calendarSyncWorker.on("ready", () => {
  console.log("🟢 CalendarSync worker is ready");
});

calendarSyncWorker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

calendarSyncWorker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} failed`, err);
});
