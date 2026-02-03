import type { ITaskerDependencies } from "@calcom/lib/tasker/types";

import type { WebhookTaskPayload } from "../types/webhookTask";
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
}
