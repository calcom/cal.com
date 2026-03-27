import { ErrorWithCode } from "@calcom/lib/errors";
import { logger, schemaTask, type TaskWithSchema } from "@trigger.dev/sdk";

import { meetingWebhookTaskPayloadSchema } from "../../types/webhookTask";
import { webhookDeliveryTaskConfig } from "./config";

const SCHEDULE_MEETING_WEBHOOK_JOB_ID = "webhook.schedule-meeting" as const;

/**
 * Trigger.dev task for delayed meeting webhook delivery (MEETING_STARTED / MEETING_ENDED).
 *
 * This task is triggered by WebhookTriggerTasker with a delay option set to the
 * meeting start or end time. When the delay expires, it processes the webhook
 * delivery using the WebhookTaskConsumer from the DI container.
 *
 * The task:
 * 1. Imports the DI container getter
 * 2. Gets the WebhookTaskConsumer instance
 * 3. Calls processWebhookTask with the meeting webhook payload
 *
 * Errors are logged and re-thrown to enable trigger.dev's retry mechanism.
 */
export const scheduleMeetingWebhook: TaskWithSchema<
  typeof SCHEDULE_MEETING_WEBHOOK_JOB_ID,
  typeof meetingWebhookTaskPayloadSchema
> = schemaTask({
  id: SCHEDULE_MEETING_WEBHOOK_JOB_ID,
  ...webhookDeliveryTaskConfig,
  schema: meetingWebhookTaskPayloadSchema,
  run: async (payload, { ctx }) => {
    const { getWebhookTaskConsumer } = await import("@calcom/features/di/webhooks/containers/webhook");

    const webhookTaskConsumer = getWebhookTaskConsumer();
    const taskId = ctx.run.id;

    try {
      await webhookTaskConsumer.processWebhookTask(payload, taskId);
      logger.info("Meeting webhook delivered successfully", {
        operationId: payload.operationId,
        taskId,
        triggerEvent: payload.triggerEvent,
        bookingId: payload.bookingId,
      });
    } catch (error) {
      if (error instanceof Error || error instanceof ErrorWithCode) {
        logger.error(error.message, { operationId: payload.operationId, taskId });
      } else {
        logger.error("Unknown error in meeting webhook delivery", {
          error,
          operationId: payload.operationId,
          taskId,
        });
      }
      throw error;
    }
  },
});
