import type { ITaskerDependencies } from "@calcom/lib/tasker/types";

import type { CancelDelayedWebhookPayload, WebhookTaskPayload } from "../types/webhookTask";
import type { IWebhookTasker, WebhookDeliveryOptions, WebhookDeliveryResult } from "./types";


function buildTags(payload: WebhookTaskPayload | CancelDelayedWebhookPayload): string[] {
  const tags: string[] = [];
  
  if ("triggerEvent" in payload && payload.triggerEvent != null) {
    tags.push(`trigger_event:${payload.triggerEvent}`);
  }


  if ("userId" in payload && payload.userId != null) {
    tags.push(`user:${payload.userId}`);
  }
  if ("teamId" in payload && payload.teamId != null) {
    tags.push(`team:${payload.teamId}`);
  }
  if ("bookingUid" in payload && payload.bookingUid != null) {
    tags.push(`booking:${payload.bookingUid}`);
  }
  if ("eventTypeId" in payload && payload.eventTypeId != null) {
    tags.push(`eventtype:${payload.eventTypeId}`);
  }
  if ("orgId" in payload && payload.orgId != null) {
    tags.push(`org:${payload.orgId}`);
  }

  return tags;
}

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

  async deliverWebhook(
    payload: WebhookTaskPayload,
    options?: WebhookDeliveryOptions
  ): Promise<WebhookDeliveryResult> {
    const { deliverWebhook } = await import("./trigger/deliver-webhook");
    const tags = buildTags(payload);
    const handle = await deliverWebhook.trigger(payload, { ...options, tags });
    return { taskId: handle.id };
  }

  async cancelDelayedWebhook(
    payload: CancelDelayedWebhookPayload
  ): Promise<WebhookDeliveryResult> {
    const { cancelDelayedWebhook } = await import("./trigger/cancel-delayed-webhook");
    const tags = buildTags(payload);
    const handle = await cancelDelayedWebhook.trigger(payload, { tags });
    return { taskId: handle.id };
  }
}
