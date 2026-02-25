import { createBullWorkflowContext } from "@calid/job-dispatcher";
import { bookingEmailsService } from "@calid/job-engine";
import type { BookingEmailsJobData } from "@calid/job-engine";
import type { Job } from "bullmq";

export async function processBookingEmails(job: Job<BookingEmailsJobData>) {
  const ctx = createBullWorkflowContext(job);

  try {
    await bookingEmailsService(ctx, job.data);
  } catch (error) {
    // Non-retriable errors should not be retried
    if (error instanceof Error && error.message.startsWith("NON_RETRIABLE:")) {
      // BullMQ: mark as failed without retry by throwing unrecoverable error
      // Discard the job by resolving successfully with a warning
      const log = (await import("@calcom/lib/logger")).default.getSubLogger({
        prefix: ["[processor/booking-emails]"],
      });
      log.warn(`Non-retriable error for job ${job.id}: ${error.message}`);
      return; // Swallow - do not retry
    }

    throw error;
  }
}
