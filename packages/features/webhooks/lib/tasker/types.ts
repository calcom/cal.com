import type { WebhookTaskPayload } from "../types/webhookTask";

/**
 * Result of delivering a webhook task
 */
export type WebhookDeliveryResult = {
  taskId: string;
};

/**
 * Interface for webhook taskers (both sync and async implementations)
 *
 * This interface defines the contract for webhook delivery taskers.
 * Implementations include:
 * - WebhookSyncTasker: Executes immediately (for E2E tests)
 * - WebhookAsyncTasker: Queues to InternalTasker (for production)
 */
export interface IWebhookTasker {
  deliverWebhook(payload: WebhookTaskPayload): Promise<WebhookDeliveryResult>;
}
