import { createBullWorkflowContext, SleepSignal } from "@calid/job-dispatcher";
import {
  triggerScheduledWebhookService,
  WebhookTriggerError,
  WebhookNotFoundError,
  WebhookRejectedError,
  type TriggerScheduledWebhookData,
  type TriggerScheduledWebhookResult,
} from "@calid/job-engine";
import type { Job } from "bullmq";
import { UnrecoverableError } from "bullmq";

import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["[processor:trigger-scheduled-webhook]"] });

export async function triggerScheduledWebhookProcessor(
  job: Job<TriggerScheduledWebhookData>
): Promise<TriggerScheduledWebhookResult> {
  log.info("Processing scheduled webhook trigger", {
    jobId: job.id,
    webhookId: job.data.id,
    attemptsMade: job.attemptsMade,
  });

  // Create workflow context from BullMQ job
  const ctx = createBullWorkflowContext(job);

  try {
    const result = await triggerScheduledWebhookService(job.data, prisma, ctx);

    log.info("Scheduled webhook processed successfully", {
      jobId: job.id,
      webhookId: job.data.id,
    });

    return result;
  } catch (error) {
    // ── Handle workflow sleep signal ──────────────────────────────────────
    if (error instanceof SleepSignal) {
      log.info("Job sleeping, will resume after delay", {
        jobId: job.id,
        duration: error.duration,
      });
      // Job will be automatically resumed by BullMQ
      throw error;
    }

    // ── Permanent failures (don't retry) ──────────────────────────────────
    if (error instanceof WebhookNotFoundError || error instanceof WebhookRejectedError) {
      log.error("Permanent failure, marking as unrecoverable", {
        jobId: job.id,
        webhookId: job.data.id,
        error: error.message,
      });
      throw new UnrecoverableError(error.message);
    }

    // ── Transient failures (retry with backoff) ──────────────────────────
    if (error instanceof WebhookTriggerError) {
      log.warn("Transient webhook failure, will retry", {
        jobId: job.id,
        webhookId: job.data.id,
        attempt: job.attemptsMade,
        error: error.message,
      });
      throw error;
    }

    // ── Unexpected errors ─────────────────────────────────────────────────
    log.error("Unexpected error, marking as unrecoverable", {
      jobId: job.id,
      webhookId: job.data.id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new UnrecoverableError(
      `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
