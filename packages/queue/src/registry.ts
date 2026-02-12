import type { Queue } from "bullmq";

import { getCalendarSyncQueue } from "./queues";

export enum QueueName {
  CALENDAR_SYNC = "calendarSync",
}

export const queueRegistry: Record<QueueName, Queue> = {
  [QueueName.CALENDAR_SYNC]: getCalendarSyncQueue(),
};
