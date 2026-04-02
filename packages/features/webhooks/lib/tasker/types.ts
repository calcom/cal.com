import type { TriggerOptions } from "@trigger.dev/sdk";
import type {
  CancelDelayedWebhookPayload,
  MeetingWebhookTaskPayload,
  WebhookTaskPayload,
} from "../types/webhookTask";

/**
 * Result of delivering a webhook task
 */
export type WebhookDeliveryResult = {
  taskId: string;
};

/**
 * Options for webhook delivery (passed through to Trigger.dev)
 */
export type WebhookDeliveryOptions = Pick<TriggerOptions, "idempotencyKey" | "idempotencyKeyTTL" | "delay">;

/**
 * Interface for webhook taskers (both sync and trigger.dev implementations)
 *
 * This interface defines the contract for webhook delivery taskers.
 * Implementations include:
 * - WebhookSyncTasker: Executes immediately (for E2E tests)
 * - WebhookTriggerTasker: Queues to trigger.dev (for production)
 */
export interface IWebhookTasker {
  deliverWebhook(
    payload: WebhookTaskPayload,
    options?: WebhookDeliveryOptions
  ): Promise<WebhookDeliveryResult>;
  cancelDelayedWebhook(payload: CancelDelayedWebhookPayload): Promise<WebhookDeliveryResult>;
  /**
   * Schedule a webhook for future delivery.
   *
   * - Async (trigger.dev): delegates to deliverWebhook with delay option
   * - Sync (E2E): writes to WebhookScheduledTriggers via legacy scheduleTrigger
   */
  scheduleWebhook(
    payload: MeetingWebhookTaskPayload,
    options?: WebhookDeliveryOptions
  ): Promise<WebhookDeliveryResult>;
}
