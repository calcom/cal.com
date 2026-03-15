import type { WebhookTaskPayload } from "../types/webhookTask";

/**
 * Result of delivering a webhook task
 */
export type WebhookDeliveryResult = {
  taskId: string;
};

/**
 * Interface for webhook taskers (both sync and trigger.dev implementations)
 *
 * This interface defines the contract for webhook delivery taskers.
 * Implementations include:
 * - WebhookSyncTasker: Executes immediately (for E2E tests)
 * - WebhookTriggerTasker: Queues to trigger.dev (for production)
 */
export interface IWebhookTasker {
  deliverWebhook(payload: WebhookTaskPayload): Promise<WebhookDeliveryResult>;
}
