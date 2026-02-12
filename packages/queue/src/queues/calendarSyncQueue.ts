import { Queue } from "bullmq";

import { getRedisOptions } from "../redis";

export const CALENDAR_SYNC_QUEUE = "calendar-sync";

let queue: Queue | null = null;

export function getCalendarSyncQueue(): Queue {
  if (!queue) {
    queue = new Queue(CALENDAR_SYNC_QUEUE, {
      connection: getRedisOptions(),
    });
  }

  return queue;
}
