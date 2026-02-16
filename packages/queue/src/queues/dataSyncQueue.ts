import { Queue } from "bullmq";

import { getRedisOptions } from "../redis";

let queue: Queue | null = null;
// const queueEvents: QueueEvents | null = null;

export const DATA_SYNC_QUEUE = "data_sync_queue";

export const DATA_SYNC_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 10000, // slower retry
  },
  removeOnComplete: {
    age: 60 * 60 * 24 * 3, // keep 3 days (audit/debug)
  },
  removeOnFail: false, // KEEP FAILED JOBS FOREVER
};

/** 
For long-running, DB-heavy, potentially blocking jobs.
Requires low concurrency.

Examples:

Calendar sync
Import from Calendly
Bookings export
*/
export function getDataSyncQueue(): Queue {
  if (!queue) {
    queue = new Queue(DATA_SYNC_QUEUE, {
      connection: getRedisOptions(),
      defaultJobOptions: DATA_SYNC_JOB_OPTIONS,
    });
  }

  return queue;
}

// export function getDataSyncQueueEvents(): QueueEvents {
//   if (!queueEvents) {
//     queueEvents = new QueueEvents(`${DATA_SYNC_QUEUE}_events`, {
//       connection: getRedisOptions(),
//     });
//   }

//   return queueEvents;
// }
