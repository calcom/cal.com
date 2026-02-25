import { Queue } from "bullmq";

import { getRedisOptions } from "../redis";

let queue: Queue | null = null;
export const SCHEDULED_QUEUE = "scheduled_queue";
// const queueEvents: QueueEvents | null = null;

export const SCHEDULED_JOB_OPTIONS = {
  attempts: 10, // VERY IMPORTANT
  backoff: {
    type: "exponential",
    delay: 5000,
  },
  removeOnComplete: {
    age: 60 * 60 * 24 * 2,
  },
  removeOnFail: {
    age: 60 * 60 * 24 * 14, // keep failures 14 days
  },
};
/**
For delayed or repeatable jobs.
Examples:

Scheduled webhook triggers
 */
export function getScheduledQueue(): Queue {
  if (!queue) {
    queue = new Queue(SCHEDULED_QUEUE, {
      connection: getRedisOptions(),
      defaultJobOptions: SCHEDULED_JOB_OPTIONS,
    });
  }

  return queue;
}

// export function getScheduledQueueEvents(): QueueEvents {
//   if (!queueEvents) {
//     queueEvents = new QueueEvents(`${SCHEDULED_QUEUE}_events`, {
//       connection: getRedisOptions(),
//     });
//   }

//   return queueEvents;
// }
