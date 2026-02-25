import { JobName, dispatcher, createBullWorkflowContext } from "@calid/job-dispatcher";
import { calendlyImportService } from "@calid/job-engine";
import type { CalendlyImportJobData } from "@calid/job-engine";
import { QueueName } from "@calid/queue";
import type { Job } from "bullmq";

export async function processCalendlyImport(job: Job<CalendlyImportJobData>) {
  const ctx = createBullWorkflowContext(job);

  try {
    await calendlyImportService(ctx, job.data);
  } catch (error) {
    // Check if this is a continuation request (not a real error)
    if (error instanceof Error && error.message === "CONTINUATION_REQUIRED") {
      // Trigger next batch
      await dispatcher.dispatch({
        queue: QueueName.DATA_SYNC,
        name: JobName.CALENDLY_IMPORT,
        data: job.data, // Same payload, Calendly API tracks pagination internally
      });
      return; // Success - continuation scheduled
    }

    // Real error - rethrow
    throw error;
  }
}
