import type { ITaskerDependencies } from "@calcom/lib/tasker/types";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { CancelMeetingWebhookPayload, MeetingWebhookTaskPayload, WebhookTaskPayload } from "../types/webhookTask";
import type { IWebhookTasker, WebhookDeliveryResult } from "./types";

/**
 * Trigger.dev Webhook Tasker
 *
 * Queues webhook delivery tasks to trigger.dev for background processing.
 * Used in production environments where ENABLE_ASYNC_TASKER is true and
 * trigger.dev is configured.
 *
 * This follows the same pattern as BookingEmailAndSmsTriggerDevTasker and
 * PlatformOrganizationBillingTriggerTasker.
 */
export class WebhookTriggerTasker implements IWebhookTasker {
  constructor(public readonly dependencies: ITaskerDependencies) {}

  async deliverWebhook(payload: WebhookTaskPayload): Promise<WebhookDeliveryResult> {
    const { deliverWebhook } = await import("./trigger/deliver-webhook");
    const handle = await deliverWebhook.trigger(payload);
    return { taskId: handle.id };
  }

  /**
   * Schedule a delayed meeting webhook via trigger.dev.
   *
   * Uses trigger.dev's delay option to schedule the task execution at the meeting
   * start or end time. Tags the run with the booking ID for later cancellation.
   */
  async scheduleMeetingWebhook(payload: MeetingWebhookTaskPayload): Promise<WebhookDeliveryResult> {
    const { scheduleMeetingWebhook } = await import("./trigger/schedule-meeting-webhook");

    const delayUntil =
      payload.triggerEvent === WebhookTriggerEvents.MEETING_ENDED
        ? new Date(payload.endTime)
        : new Date(payload.startTime);

    const handle = await scheduleMeetingWebhook.trigger(payload, {
      delay: delayUntil,
      tags: [`booking-${payload.bookingId}`, `meeting-webhook`],
    });

    return { taskId: handle.id };
  }

  /**
   * Cancel previously scheduled meeting webhooks via a trigger.dev task.
   *
   * Triggers a task that cancels all pending meeting webhook runs for the booking.
   */
  async cancelMeetingWebhook(payload: CancelMeetingWebhookPayload): Promise<void> {
    const { cancelMeetingWebhook } = await import("./trigger/cancel-meeting-webhook");
    await cancelMeetingWebhook.trigger(payload);
  }
}
