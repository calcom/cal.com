import { logger, runs, schemaTask } from "@trigger.dev/sdk";

import type { CancelDelayedWebhookPayload } from "../../types/webhookTask";
import { cancelDelayedWebhookPayloadSchema } from "../../types/webhookTask";
import { webhookDeliveryTaskConfig } from "./config";

const CANCEL_DELAYED_WEBHOOK_JOB_ID = "webhook.cancel-delayed" as const;

/** States we consider cancellable — runs already executing or completed are left alone. */
export const CANCELLABLE_RUN_STATUSES = ["QUEUED", "DELAYED"] as const;

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Build the tag used to look up delayed runs for a given booking.
 */
export function buildBookingTag(bookingUid: string): string {
  return `booking:${bookingUid}`;
}

/**
 * Result of attempting to cancel trigger.dev runs for a booking.
 */
export interface CancelRunsResult {
  cancelled: number;
  failed: number;
}

/**
 * Find and cancel all trigger.dev runs tagged with the given booking tag
 * that are in a cancellable state (QUEUED or DELAYED).
 *
 * Returns counts of successfully cancelled and failed cancellation attempts.
 */
export async function cancelRunsByTag(tag: string): Promise<CancelRunsResult> {
  let cancelled = 0;
  let failed = 0;

  for await (const run of runs.list({ tag: [tag], status: [...CANCELLABLE_RUN_STATUSES] })) {
    try {
      await runs.cancel(run.id);
      cancelled++;
      logger.info("Cancelled delayed webhook run", { runId: run.id });
    } catch (error) {
      failed++;
      logger.error("Failed to cancel delayed webhook run", {
        runId: run.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { cancelled, failed };
}

/**
 * Fall back to DB-level cleanup via `deleteWebhookScheduledTriggers`.
 *
 * This handles the case where the booking was created while the sync tasker
 * was active (before trigger.dev was available), so no trigger.dev runs exist
 * but there may be rows in the `webhookScheduledTriggers` table.
 */
export async function fallbackDbCleanup(payload: CancelDelayedWebhookPayload): Promise<void> {
  const { deleteWebhookScheduledTriggers } = await import(
    "@calcom/features/webhooks/lib/scheduleTrigger"
  );
  await deleteWebhookScheduledTriggers({
    booking: { id: payload.bookingId, uid: payload.bookingUid },
  });
}

/**
 * Log the final summary of the cancellation operation.
 */
export function logCancellationSummary(
  bookingUid: string,
  result: CancelRunsResult
): void {
  logger.info("Delayed webhook cancellation complete", {
    bookingUid,
    cancelled: result.cancelled,
    failed: result.failed,
  });
}

// ---------------------------------------------------------------------------
// Trigger.dev task
// ---------------------------------------------------------------------------

/**
 * Trigger.dev task that cancels previously scheduled delayed webhooks
 * (MEETING_STARTED / MEETING_ENDED) for a given booking.
 *
 * Scheduled delayed webhooks are tagged with `booking:{bookingUid}` so we
 * can look them up via `runs.list`. Any run in QUEUED or DELAYED state is
 * cancelled; already-executing or completed runs are left alone.
 *
 * Falls back to DB-level cleanup via `deleteWebhookScheduledTriggers` only
 * when no trigger.dev runs were found at all (e.g. the booking was created
 * while the sync tasker was active).
 */
export const cancelDelayedWebhook = schemaTask({
  id: CANCEL_DELAYED_WEBHOOK_JOB_ID,
  ...webhookDeliveryTaskConfig,
  schema: cancelDelayedWebhookPayloadSchema,
  run: async (payload) => {
    const tag = buildBookingTag(payload.bookingUid);

    logger.info("Cancelling delayed webhooks for booking", {
      bookingUid: payload.bookingUid,
      tag,
    });

    const result = await cancelRunsByTag(tag);

    // Only fall back to DB cleanup if no trigger.dev runs were found
    if (result.cancelled === 0 && result.failed === 0) {
      await fallbackDbCleanup(payload);
    }

    logCancellationSummary(payload.bookingUid, result);
  },
});
