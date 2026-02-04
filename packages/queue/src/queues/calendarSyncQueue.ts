import { Queue } from "bullmq";

import { redisConnection } from "../redis";

export const CALENDAR_SYNC_QUEUE = "calendar-sync";

export function getCalendarSyncQueue() {
  return new Queue(CALENDAR_SYNC_QUEUE, {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 30_000, // 30s
      },
      removeOnComplete: {
        age: 24 * 3600,
      },
      removeOnFail: false,
    },
  });
}
