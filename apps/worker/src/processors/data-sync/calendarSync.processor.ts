import { handleGoogleCalendarSync } from "@calid/job-engine";
import type { CalendarSyncJobData } from "@calid/job-engine";
import type { Job } from "bullmq";

export async function processCalendarSync(job: Job<CalendarSyncJobData>) {
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
