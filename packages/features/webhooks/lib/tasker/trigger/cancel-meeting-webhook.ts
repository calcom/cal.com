import { logger, runs, schemaTask, type TaskWithSchema } from "@trigger.dev/sdk";

import { cancelMeetingWebhookPayloadSchema } from "../../types/webhookTask";
import { webhookDeliveryTaskConfig } from "./config";
import { scheduleMeetingWebhook } from "./schedule-meeting-webhook";

const CANCEL_MEETING_WEBHOOK_JOB_ID = "webhook.cancel-meeting" as const;

/**
 * Trigger.dev task to cancel previously scheduled meeting webhooks.
 *
 * When a booking is cancelled, this task finds and cancels all pending
 * trigger.dev runs tagged with the booking ID that were created by
 * the schedule-meeting-webhook task.
 *
 * It also deletes any webhookScheduledTriggers DB entries as a safety net
 * (in case the sync tasker was used as a fallback).
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

      // Find and cancel all pending trigger.dev runs for this booking's meeting webhooks
      for await (const run of runs.list({
        tag: bookingTag,
        taskIdentifier: [scheduleMeetingWebhook.id],
        status: ["QUEUED", "DELAYED"],
      })) {
        try {
          await runs.cancel(run.id);
          cancelled++;
        } catch {
          failed++;
        }
      }

      // Also delete webhookScheduledTriggers DB entries as a safety net
      const { deleteWebhookScheduledTriggers } = await import(
        "@calcom/features/webhooks/lib/scheduleTrigger"
      );
      await deleteWebhookScheduledTriggers({
        booking: { id: payload.bookingId, uid: payload.bookingUid },
      });

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
