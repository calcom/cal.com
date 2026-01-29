import { Tasker } from "@calcom/lib/tasker/Tasker";
import type { Logger } from "tslog";

import type { WebhookTaskPayload } from "../types/webhookTask";
import type { WebhookAsyncTasker } from "./WebhookAsyncTasker";
import type { WebhookSyncTasker } from "./WebhookSyncTasker";
import type { IWebhookTasker, WebhookDeliveryResult } from "./types";

/**
 * Dependencies for WebhookTasker
 */
export interface WebhookTaskerDependencies {
  asyncTasker: WebhookAsyncTasker;
  syncTasker: WebhookSyncTasker;
  logger: Logger<unknown>;
}

/**
 * Webhook Tasker with Async/Sync Fallback
 *
 * This tasker automatically selects the appropriate execution mode:
 * - Production (ENABLE_ASYNC_TASKER=true): Uses WebhookAsyncTasker to queue tasks
 * - E2E Tests (ENABLE_ASYNC_TASKER=false): Uses WebhookSyncTasker for immediate execution
 *
 * The base Tasker class handles the mode selection based on environment variables:
 * - ENABLE_ASYNC_TASKER (automatically false in E2E tests)
 * - TRIGGER_SECRET_KEY
 * - TRIGGER_API_URL
 *
 * This pattern ensures webhooks are delivered immediately in E2E tests
 * without requiring the cron job that processes queued tasks.
 */
export class WebhookTasker extends Tasker<IWebhookTasker> {
  constructor(dependencies: WebhookTaskerDependencies) {
    super(dependencies);
  }

  async deliverWebhook(payload: WebhookTaskPayload): Promise<WebhookDeliveryResult> {
    return await this.dispatch("deliverWebhook", payload);
  }
}
