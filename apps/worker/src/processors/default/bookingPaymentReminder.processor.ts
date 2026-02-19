import { createBullWorkflowContext, SleepSignal } from "@calid/job-dispatcher/adapter/bull";
import {
  bookingPaymentReminderService,
  PaymentReminderError,
  BookingNotFoundError,
  PaymentAppNotFoundError,
  type BookingPaymentReminderData,
  type BookingPaymentReminderResult,
} from "@calid/job-engine";
import type { Job } from "bullmq";
import { UnrecoverableError } from "bullmq";

import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["[processor:booking-payment-reminder]"] });

export async function bookingPaymentReminderProcessor(
  job: Job<BookingPaymentReminderData>
): Promise<BookingPaymentReminderResult> {
  log.info("Processing booking payment reminder", {
    jobId: job.id,
    bookingId: job.data.booking.id,
    attemptsMade: job.attemptsMade,
  });

  // Create workflow context from BullMQ job
  const workflow = createBullWorkflowContext(job);

  try {
    const result = await bookingPaymentReminderService(job.data, prisma, workflow);

    log.info("Booking payment reminder processed", {
      jobId: job.id,
      bookingId: result.bookingId,
      paymentCompleted: result.paymentCompleted,
      reminderSent: result.reminderSent,
    });

    return result;
  } catch (error) {
    // ── Handle workflow sleep signal ──────────────────────────────────────
    if (error instanceof SleepSignal) {
      log.info("Job sleeping (10 minute delay)", {
        jobId: job.id,
        bookingId: job.data.booking.id,
        duration: error.duration,
      });
      throw error;
    }

    // ── Booking not found (permanent failure) ─────────────────────────────
    if (error instanceof BookingNotFoundError) {
      log.error("Booking not found, marking as unrecoverable", {
        jobId: job.id,
        bookingId: error.bookingId,
      });
      throw new UnrecoverableError(error.message);
    }

    // ── Payment app not found (permanent failure) ─────────────────────────
    if (error instanceof PaymentAppNotFoundError) {
      log.error("Payment app not found, marking as unrecoverable", {
        jobId: job.id,
        appKey: error.appKey,
      });
      throw new UnrecoverableError(error.message);
    }

    // ── Transient errors (retry) ──────────────────────────────────────────
    if (error instanceof PaymentReminderError) {
      log.warn("Payment reminder error, will retry", {
        jobId: job.id,
        bookingId: job.data.booking.id,
        attempt: job.attemptsMade,
        error: error.message,
      });
      throw error;
    }

    // ── Unexpected errors (retry) ─────────────────────────────────────────
    log.error("Unexpected error in payment reminder", {
      jobId: job.id,
      bookingId: job.data.booking.id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
