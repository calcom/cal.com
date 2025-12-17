import { webhookTaskPayloadSchema } from "@calcom/features/webhooks/lib/types/webhookTask";
import { getWebhookTaskConsumer } from "@calcom/features/di/webhooks/containers/webhook";

/**
 * Webhook Delivery Task Handler
 * 
 * This task is queued by WebhookTaskerProducerService and processed here.
 * It delegates to WebhookTaskConsumer (via DI) which handles the heavy lifting:
 * - Fetching webhook subscribers
 * - Fetching event-specific data from database
 * - Building versioned webhook payloads
 * - Sending HTTP requests to subscriber URLs
 * 
 * This handler can be deployed to trigger.dev for scalability.
 */
export async function webhookDelivery(payload: string, taskId?: string): Promise<void> {
  try {
    // Parse and validate the payload
    const parsedPayload = webhookTaskPayloadSchema.parse(JSON.parse(payload));

    // Get the consumer service via DI
    const consumer = getWebhookTaskConsumer();

    // Delegate to consumer for processing
    await consumer.processWebhookTask(parsedPayload, taskId || "unknown");
  } catch (error) {
    console.error("[webhookDelivery] Failed to process webhook delivery task", {
      taskId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
