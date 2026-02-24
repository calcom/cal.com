import { Queue } from "bullmq";

import { getRedisOptions } from "../redis";

let queue: Queue | null = null;
// const queueEvents: QueueEvents | null = null;
export const DEFAULT_QUEUE = "default_queue";

const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 3000,
  },
  removeOnComplete: {
    age: 60 * 60 * 24 * 7, // keep 1 day
    count: 1000,
  },
  removeOnFail: {
    age: 60 * 60 * 24 * 7, // keep failed jobs for 7 days
  },
};

/** 
For IO-heavy, short/medium-running, horizontally scalable jobs.

Examples:

Booking emails
Notifications / reminders
Integrations / webhooks
Maintenance / cron job
*/
export function getDefaultQueue(): Queue {
  if (!queue) {
    queue = new Queue(DEFAULT_QUEUE, {
      connection: getRedisOptions(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
  }

  return queue;
}

// export function getDefaultQueueEvents(): QueueEvents {
//   if (!queueEvents) {
//     queueEvents = new QueueEvents(`${DEFAULT_QUEUE}_events`, {
//       connection: getRedisOptions(),
//     });
//   }

//   return queueEvents;
// }
