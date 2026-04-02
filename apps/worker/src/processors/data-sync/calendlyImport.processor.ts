import { JobName, dispatcher, createBullWorkflowContext } from "@calid/job-dispatcher";
import { calendlyImportService, runCalendlyImportWithContinuation } from "@calid/job-engine";
import type { CalendlyImportJobData } from "@calid/job-engine";
import { QueueName } from "@calid/queue";
import type { Job } from "bullmq";

export async function processCalendlyImport(job: Job<CalendlyImportJobData>) {
  const ctx = createBullWorkflowContext(job);

  await runCalendlyImportWithContinuation({
    runImport: async () => {
      await calendlyImportService(ctx, job.data);
    },
    scheduleContinuation: async () => {
      await dispatcher.dispatch({
        queue: QueueName.DATA_SYNC,
        name: JobName.CALENDLY_IMPORT,
        data: job.data, // Same payload, Calendly API tracks pagination internally
      });
    },
  });
}
