import { logger, runs, schemaTask, type TaskWithSchema } from "@trigger.dev/sdk";

import { cancelMeetingWebhookPayloadSchema } from "../../types/webhookTask";
import { webhookDeliveryTaskConfig } from "./config";
import { deliverWebhook } from "./deliver-webhook";

const CANCEL_MEETING_WEBHOOK_JOB_ID = "webhook.cancel-meeting" as const;

/**
 * Trigger.dev task to cancel previously scheduled meeting webhooks.
 *
 * When a booking is cancelled, this task finds and cancels all pending
 * delayed deliver-webhook runs tagged with the booking ID.
 *
 * Falls back to deleting webhookScheduledTriggers DB entries only if
 * no trigger.dev runs were found (i.e. the sync tasker was used).
 */
export const cancelMeetingWebhook: TaskWithSchema<
  typeof CANCEL_MEETING_WEBHOOK_JOB_ID,
  typeof cancelMeetingWebhookPayloadSchema
> = schemaTask({
  id: CANCEL_MEETING_WEBHOOK_JOB_ID,
  ...webhookDeliveryTaskConfig,
  schema: cancelMeetingWebhookPayloadSchema,
  run: async (payload, { ctx }) => {
    const taskId = ctx.run.id;
    const bookingTag = `booking-${payload.bookingId}`;

    try {
      let cancelled = 0;
      let failed = 0;

      for await (const run of runs.list({
        tag: bookingTag,
        taskIdentifier: [deliverWebhook.id],
        status: ["QUEUED", "DELAYED"],
      })) {
        try {
          await runs.cancel(run.id);
          cancelled++;
        } catch {
          failed++;
        }
      }

      // Only fall back to DB cleanup if no trigger.dev runs were found
      if (cancelled === 0 && failed === 0) {
        const { deleteWebhookScheduledTriggers } = await import(
          "@calcom/features/webhooks/lib/scheduleTrigger"
        );
        await deleteWebhookScheduledTriggers({
          booking: { id: payload.bookingId, uid: payload.bookingUid },
        });
      }

      logger.info("Meeting webhook cancellation completed", {
        taskId,
        bookingId: payload.bookingId,
        cancelledRuns: cancelled,
        failedCancellations: failed,
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error(error.message, { taskId, bookingId: payload.bookingId });
      } else {
        logger.error("Unknown error cancelling meeting webhooks", {
          error,
          taskId,
          bookingId: payload.bookingId,
        });
      }
      throw error;
    }
  },
});
