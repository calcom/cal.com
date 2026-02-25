import { createBullWorkflowContext } from "@calid/job-dispatcher";
import { whatsappReminderScheduledService } from "@calid/job-engine";
import type { WhatsAppReminderScheduledJobData } from "@calid/job-engine";
import type { Job } from "bullmq";

export async function processWhatsappReminderScheduled(job: Job<WhatsAppReminderScheduledJobData>) {
  const ctx = createBullWorkflowContext(job);

  try {
    await whatsappReminderScheduledService(ctx, job.data);
  } catch (error) {
    // Check if error is non-retriable (marked with NON_RETRIABLE: prefix)
    if (error instanceof Error && error.message.startsWith("NON_RETRIABLE:")) {
      // Log but don't throw - prevents BullMQ from retrying
      console.error(`Non-retriable WhatsApp error for reminder ${job.data.reminderId}:`, error.message);
      return; // Success - job will not be retried
    }

    // Retriable error - throw to trigger BullMQ retry
    throw error;
  }
}
