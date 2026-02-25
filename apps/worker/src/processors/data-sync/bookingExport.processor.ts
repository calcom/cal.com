import { createBullWorkflowContext } from "@calid/job-dispatcher";
import { bookingExportService } from "@calid/job-engine";
import type { BookingExportJobData } from "@calid/job-engine";
import type { Job } from "bullmq";

export async function processBookingExport(job: Job<BookingExportJobData>) {
  const ctx = createBullWorkflowContext(job);
  await bookingExportService(ctx, job.data);
}
