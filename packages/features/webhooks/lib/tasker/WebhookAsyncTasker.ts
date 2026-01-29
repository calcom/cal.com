import type { Tasker } from "@calcom/features/tasker/tasker";

import type { WebhookTaskPayload } from "../types/webhookTask";
import type { IWebhookTasker, WebhookDeliveryResult } from "./types";

/**
 * Dependencies for WebhookAsyncTasker
 */
export interface IWebhookAsyncTaskerDeps {
  tasker: Tasker;
}

/**
 * Asynchronous Webhook Tasker
 *
 * Queues webhook delivery tasks to the InternalTasker for background processing.
 * Used in production environments where tasks are processed by a cron job.
 *
 * This is the current production behavior, extracted into a dedicated class
 * to support the async/sync fallback pattern.
 */
export class WebhookAsyncTasker implements IWebhookTasker {
  constructor(private readonly deps: IWebhookAsyncTaskerDeps) {}

  async deliverWebhook(payload: WebhookTaskPayload): Promise<WebhookDeliveryResult> {
    const taskId = await this.deps.tasker.create("webhookDelivery", payload);
    return { taskId };
  }
}
