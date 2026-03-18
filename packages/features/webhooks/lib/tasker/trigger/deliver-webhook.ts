import { ErrorWithCode } from "@calcom/lib/errors";
import { logger, retry, schemaTask, type TaskWithSchema } from "@trigger.dev/sdk";
import type { WebhookTaskPayload } from "../../types/webhookTask";
import { webhookDeliveryTaskConfig, webhookRetryConfig } from "./config";
import { webhookDeliveryTaskSchema } from "./schema";

const WEBHOOK_DELIVERY_JOB_ID = "webhook.deliver" as const;

/**
 * Trigger.dev task for webhook delivery with per-subscriber retries.
 *
 * Instead of processing all subscribers as a single unit (which would retry
 * ALL subscribers when one fails), this task uses retry.onThrow to retry
 * each subscriber independently. Only failed subscribers are retried.
 *
 * Flow:
 * 1. Imports the DI container getters
 * 2. Prepares webhook delivery data (subscribers + payload) via WebhookTaskConsumer
 * 3. For each subscriber, uses retry.onThrow to send with individual retries
 * 4. Collects results and logs failures without retrying the entire task
 */
export const deliverWebhook: TaskWithSchema<
  typeof WEBHOOK_DELIVERY_JOB_ID,
  typeof webhookDeliveryTaskSchema
> = schemaTask({
  id: WEBHOOK_DELIVERY_JOB_ID,
  ...webhookDeliveryTaskConfig,
  schema: webhookDeliveryTaskSchema,
  run: async (payload: WebhookTaskPayload, { ctx }) => {
    const { getWebhookTaskConsumer, getWebhookService } = await import(
      "@calcom/features/di/webhooks/containers/webhook"
    );

    const webhookTaskConsumer = getWebhookTaskConsumer();
    const webhookService = getWebhookService();
    const taskId = ctx.run.id;

    const prepared = await webhookTaskConsumer.prepareWebhookDelivery(payload, taskId);

    if (!prepared) {
      logger.info("No webhooks to deliver", { operationId: payload.operationId, taskId });
      return;
    }

    const { subscribers, triggerEvent, webhookPayload } = prepared;

    logger.info("Delivering webhooks to subscribers", {
      operationId: payload.operationId,
      taskId,
      subscriberCount: subscribers.length,
    });

    const results = await Promise.allSettled(
      subscribers.map(async (subscriber) => {
        await retry.onThrow(async () => {
          await webhookService.sendWebhookDirectly(triggerEvent, webhookPayload, subscriber);
        }, webhookRetryConfig);
      })
    );

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failureCount = results.filter((r) => r.status === "rejected").length;

    logger.info("Webhook delivery completed", {
      operationId: payload.operationId,
      taskId,
      total: subscribers.length,
      succeeded: successCount,
      failed: failureCount,
    });

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const subscriber = subscribers[i];
      if (result.status === "fulfilled") {
        logger.info("Webhook delivery succeeded for subscriber", {
          operationId: payload.operationId,
          taskId,
          webhookId: subscriber.id,
          subscriberUrl: subscriber.subscriberUrl,
        });
      } else {
        const error = result.reason;
        logger.error("Webhook delivery failed for subscriber after retries", {
          operationId: payload.operationId,
          taskId,
          webhookId: subscriber.id,
          subscriberUrl: subscriber.subscriberUrl,
          error: error instanceof Error || error instanceof ErrorWithCode ? error.message : String(error),
        });
      }
    }

    if (failureCount > 0) {
      logger.error("Webhook delivery completed with failures", {
        operationId: payload.operationId,
        taskId,
        succeeded: successCount,
        failed: failureCount,
      });
    }
  },
});
