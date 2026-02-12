import { handleGoogleCalendarSync } from "@calid/calendar-sync";
import type { CalendarSyncJob } from "@calid/queue/types";
import type { Job } from "bullmq";

export async function processCalendarSync(job: Job<CalendarSyncJob>) {
  const { userId, provider, syncType, cursor } = job.data;

  job.log(`Starting ${syncType} sync for ${provider}`);
  console.log(`Starting ${syncType} sync for ${provider}`);

  switch (provider) {
    case "google":
      await handleGoogleCalendarSync(Number(userId));
      break;
    case "outlook":
      // outlook sync logic
      break;
  }

  job.log("Sync completed");
  console.log("Sync completed");
}
