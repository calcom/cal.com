import type { Queue, QueueEvents } from "bullmq";

import {
  DEFAULT_QUEUE,
  getDefaultQueue,
  DATA_SYNC_QUEUE,
  getDataSyncQueue,
  SCHEDULED_QUEUE,
  getScheduledQueue,
  getDefaultQueueEvents,
  getDataSyncQueueEvents,
  getScheduledQueueEvents,
} from "./queues";

export enum QueueName {
  DEFAULT = DEFAULT_QUEUE,
  DATA_SYNC = DATA_SYNC_QUEUE,
  SCHEDULED = SCHEDULED_QUEUE,
}

export const queueRegistry: Record<QueueName, Queue> = {
  [QueueName.DEFAULT]: getDefaultQueue(),
  [QueueName.DATA_SYNC]: getDataSyncQueue(),
  [QueueName.SCHEDULED]: getScheduledQueue(),
};

export const queueEventsRegistry: Record<QueueName, QueueEvents> = {
  [QueueName.DEFAULT]: getDefaultQueueEvents(),
  [QueueName.DATA_SYNC]: getDataSyncQueueEvents(),
  [QueueName.SCHEDULED]: getScheduledQueueEvents(),
};
