import type { DefaultJob, DataSyncJob, ScheduledJob } from "@calid/job-engine";
import type { Job } from "bullmq";

//needed so manually retried jobs from queuedash dashboard could be resolved,as on
//queuedash rerun action job is enqueued with name "Manual add" which would not resolve
export function resolveJobName(job: Job<DataSyncJob | DefaultJob | ScheduledJob>): string {
  // Normal dispatch path
  if (job.name !== "Manual add") return job.name;

  // QueueDash rerun path
  if (job.data?.name) return job.data.name;

  throw new Error("Unable to resolve job name");
}
