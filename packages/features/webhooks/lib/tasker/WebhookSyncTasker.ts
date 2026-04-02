import { nanoid } from "nanoid";
import type { WebhookTaskConsumer } from "../service/WebhookTaskConsumer";
import type { WebhookTaskPayload } from "../types/webhookTask";
import type { IWebhookTasker, WebhookDeliveryResult } from "./types";

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

  async deliverWebhook(payload: WebhookTaskPayload): Promise<WebhookDeliveryResult> {
    const taskId = `sync_${nanoid(10)}`;
    await this.deps.webhookTaskConsumer.processWebhookTask(payload, taskId);
    return { taskId };
  }
}
