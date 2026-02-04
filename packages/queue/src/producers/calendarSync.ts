import type { CalendarSyncJob } from "@calcom/types/Jobs";

import { getCalendarSyncQueue } from "../queues/calendarSyncQueue";

export async function enqueueCalendarSync(job: CalendarSyncJob) {
  const calendarQueue = getCalendarSyncQueue();
  await calendarQueue.add("calendar-sync", job, {
    jobId: `${job.userId}:${job.provider}`, // idempotency
  });
}

// //usage
// await enqueueCalendarSync({
//   userId,
//   provider: "google",
//   syncType: "initial",
//   triggeredAt: new Date().toISOString(),
// });
