import { nanoid } from "nanoid";

import getWebhooks from "../getWebhooks";
import { deleteWebhookScheduledTriggers, scheduleTrigger } from "../scheduleTrigger";
import type { WebhookTaskConsumer } from "../service/WebhookTaskConsumer";
import type { CancelMeetingWebhookPayload, MeetingWebhookTaskPayload, WebhookTaskPayload } from "../types/webhookTask";
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

  /**
   * Schedule a delayed meeting webhook using webhookScheduledTriggers (DB-based scheduling).
   *
   * Fetches matching webhook subscribers and creates a scheduled trigger entry for each.
   * These entries are processed by the cron job at the appropriate time.
   */
  async scheduleMeetingWebhook(payload: MeetingWebhookTaskPayload): Promise<WebhookDeliveryResult> {
    const taskId = `sync_meeting_${nanoid(10)}`;

    const subscribers = await getWebhooks({
      userId: payload.userId ?? null,
      eventTypeId: payload.eventTypeId ?? 0,
      triggerEvent: payload.triggerEvent,
      teamId: payload.teamId ?? undefined,
      orgId: payload.orgId,
      oAuthClientId: payload.oAuthClientId,
    });

    const booking = {
      id: payload.bookingId,
      startTime: new Date(payload.startTime),
      endTime: new Date(payload.endTime),
    };

    const promises = subscribers.map((subscriber) =>
      scheduleTrigger({
        booking,
        subscriberUrl: subscriber.subscriberUrl,
        subscriber: {
          id: subscriber.id,
          appId: subscriber.appId,
        },
        triggerEvent: payload.triggerEvent,
      })
    );

    await Promise.all(promises);
    return { taskId };
  }

  /**
   * Cancel previously scheduled meeting webhooks by deleting webhookScheduledTriggers entries.
   */
  async cancelMeetingWebhook(payload: CancelMeetingWebhookPayload): Promise<void> {
    await deleteWebhookScheduledTriggers({
      booking: { id: payload.bookingId, uid: payload.bookingUid },
    });
  }
}
