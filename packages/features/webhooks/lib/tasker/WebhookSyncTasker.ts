import { nanoid } from "nanoid";

import type { WebhookTaskConsumer } from "../service/WebhookTaskConsumer";
import type { CancelDelayedWebhookPayload, WebhookTaskPayload } from "../types/webhookTask";
import type { IWebhookTasker, WebhookDeliveryOptions, WebhookDeliveryResult } from "./types";

/**
 * Dependencies for WebhookSyncTasker
 */
export interface IWebhookSyncTaskerDeps {
  webhookTaskConsumer: WebhookTaskConsumer;
}

/**
 * Synchronous Webhook Tasker
 *
 * Executes webhook delivery immediately without queuing.
 * Used in E2E tests and development environments where the async tasker
 * (InternalTasker + cron) is not available.
 *
 * This follows the same pattern as MonthlyProrationSyncTasker.
 */
export class WebhookSyncTasker implements IWebhookTasker {
  constructor(private readonly deps: IWebhookSyncTaskerDeps) {}

  async deliverWebhook(
    payload: WebhookTaskPayload,
    _options?: WebhookDeliveryOptions
  ): Promise<WebhookDeliveryResult> {
    const taskId = `sync_${nanoid(10)}`;
    await this.deps.webhookTaskConsumer.processWebhookTask(payload, taskId);
    return { taskId };
  }

  async cancelDelayedWebhook(
    payload: CancelDelayedWebhookPayload
  ): Promise<WebhookDeliveryResult> {
    const { deleteWebhookScheduledTriggers } = await import("@calcom/features/webhooks/lib/scheduleTrigger");

    await deleteWebhookScheduledTriggers({
      booking: { id: payload.bookingId, uid: payload.bookingUid },
    });

    return { taskId: `sync_cancel_${nanoid(10)}` };
  }
}
