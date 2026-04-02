import { ErrorWithCode } from "@calcom/lib/errors";
import { logger, schemaTask, type TaskWithSchema } from "@trigger.dev/sdk";
import type { WebhookTaskPayload } from "../../types/webhookTask";
import { webhookDeliveryTaskConfig } from "./config";
import { webhookDeliveryTaskSchema } from "./schema";

const WEBHOOK_DELIVERY_JOB_ID = "webhook.deliver" as const;

/**
 * Trigger.dev task for webhook delivery
 *
 * This task is triggered by WebhookTriggerTasker and processes webhook
 * delivery using the WebhookTaskConsumer from the DI container.
 *
 * The task:
 * 1. Imports the DI container getter
 * 2. Gets the WebhookTaskConsumer instance
 * 3. Calls processWebhookTask with the payload
 *
 * Errors are logged and re-thrown to enable trigger.dev's retry mechanism.
 */
export const deliverWebhook: TaskWithSchema<
  typeof WEBHOOK_DELIVERY_JOB_ID,
  typeof webhookDeliveryTaskSchema
> = schemaTask({
  id: WEBHOOK_DELIVERY_JOB_ID,
  ...webhookDeliveryTaskConfig,
  schema: webhookDeliveryTaskSchema,
  run: async (payload: WebhookTaskPayload, { ctx }) => {
    const { getWebhookTaskConsumer } = await import("@calcom/features/di/webhooks/containers/webhook");

    const webhookTaskConsumer = getWebhookTaskConsumer();
    const taskId = ctx.run.id;

    try {
      await webhookTaskConsumer.processWebhookTask(payload, taskId);
      logger.info("Webhook delivered successfully", { operationId: payload.operationId, taskId });
    } catch (error) {
      if (error instanceof Error || error instanceof ErrorWithCode) {
        logger.error(error.message, { operationId: payload.operationId, taskId });
      } else {
        logger.error("Unknown error in webhook delivery", {
          error,
          operationId: payload.operationId,
          taskId,
        });
      }
      throw error;
    }
  },
});
