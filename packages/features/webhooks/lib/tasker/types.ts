import type { CancelMeetingWebhookPayload, MeetingWebhookTaskPayload, WebhookTaskPayload } from "../types/webhookTask";

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

  /**
   * Schedule a delayed meeting webhook (MEETING_STARTED or MEETING_ENDED).
   *
   * - SyncTasker: Creates webhookScheduledTriggers DB entries via scheduleTrigger
   * - TriggerTasker: Triggers a delayed trigger.dev task
   */
  scheduleMeetingWebhook(payload: MeetingWebhookTaskPayload): Promise<WebhookDeliveryResult>;

  /**
   * Cancel previously scheduled meeting webhooks for a booking.
   *
   * - SyncTasker: Calls deleteWebhookScheduledTriggers
   * - TriggerTasker: Triggers a trigger.dev task to cancel pending runs
   */
  cancelMeetingWebhook(payload: CancelMeetingWebhookPayload): Promise<void>;
}
