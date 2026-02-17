import type { NotificationDispatcherService } from "@calcom/features/notifications/services/NotificationDispatcherService";
import type { NotificationEvent } from "@calcom/features/notifications/types/NotificationChannel";
import type { WebhookSubscriber } from "../dto/types";
import type { IWebhookDataFetcher } from "../interface/IWebhookDataFetcher";
import type { IWebhookRepository } from "../interface/IWebhookRepository";
import type { ILogger } from "../interface/infrastructure";
import type { WebhookTaskPayload } from "../types/webhookTask";

const NOTIFICATION_CHANNEL_APP_IDS = new Set(["slack"]);

/**
 * Webhook Task Consumer
 *
 * Processes webhook delivery tasks from the queue:
 * 1. Fetches webhook subscribers
 * 2. Fetches event-specific data from database (via injected data fetchers)
 * 3. Builds and sends webhook payloads
 *
 * Architecture:
 * - Uses Strategy Pattern: Data fetchers are injected, consumer orchestrates
 * - Open/Closed: Add new webhook types by registering fetchers, no code modification
 * - Single Responsibility: Consumer orchestrates, fetchers handle domain logic
 * - Dependency Inversion: Depends on IWebhookDataFetcher interface
 *
 * Phase 0: Scaffold with placeholders for HTTP delivery
 * Phase 1+: Full implementation with PayloadBuilders and HTTP client
 */
export class WebhookTaskConsumer {
  private readonly log: ILogger;

  constructor(
    private readonly webhookRepository: IWebhookRepository,
    private readonly dataFetchers: IWebhookDataFetcher[],
    logger: ILogger,
    private readonly notificationDispatcher?: NotificationDispatcherService
  ) {
    this.log = logger.getSubLogger({ prefix: ["[WebhookTaskConsumer]"] });
  }

  /**
   * Main entry point for processing webhook delivery tasks.
   */
  async processWebhookTask(payload: WebhookTaskPayload, taskId: string): Promise<void> {
    this.log.debug("Processing webhook delivery task", {
      operationId: payload.operationId,
      taskId,
      triggerEvent: payload.triggerEvent,
    });

    try {
      // Step 1: Get the appropriate data fetcher for this trigger event
      const fetcher = this.getDataFetcher(payload.triggerEvent);

      if (!fetcher) {
        this.log.error("No data fetcher found for trigger event", {
          operationId: payload.operationId,
          triggerEvent: payload.triggerEvent,
        });
        throw new Error(`No data fetcher registered for trigger event: ${payload.triggerEvent}`);
      }

      // Step 2: Fetch webhook subscribers
      const subscriberContext = fetcher.getSubscriberContext(payload);
      const subscribers = await this.webhookRepository.getSubscribers(subscriberContext);

      if (subscribers.length === 0) {
        this.log.debug("No webhook subscribers found", { operationId: payload.operationId });
        return;
      }

      this.log.debug(`Found ${subscribers.length} webhook subscriber(s)`, {
        operationId: payload.operationId,
      });

      // Step 3: Fetch event-specific data via data fetcher
      const eventData = await fetcher.fetchEventData(payload);

      if (!eventData) {
        this.log.warn("Event data not found", {
          operationId: payload.operationId,
          triggerEvent: payload.triggerEvent,
        });
        return;
      }

      // Step 4: Build and send webhooks to each subscriber
      await this.sendWebhooksToSubscribers(subscribers, eventData, payload);

      this.log.debug("Webhook delivery task completed", {
        operationId: payload.operationId,
        subscriberCount: subscribers.length,
      });
    } catch (error) {
      this.log.error("Failed to process webhook delivery task", {
        operationId: payload.operationId,
        taskId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get the appropriate data fetcher for the trigger event.
   *
   * Uses polymorphism via canHandle() method - each fetcher knows which events it handles.
   */
  private getDataFetcher(triggerEvent: string): IWebhookDataFetcher | null {
    return this.dataFetchers.find((fetcher) => fetcher.canHandle(triggerEvent as never)) || null;
  }

  private async sendWebhooksToSubscribers(
    subscribers: WebhookSubscriber[],
    eventData: Record<string, unknown>,
    payload: WebhookTaskPayload
  ): Promise<void> {
    const notificationSubscribers = subscribers.filter(
      (s) => s.appId && NOTIFICATION_CHANNEL_APP_IDS.has(s.appId)
    );
    const httpSubscribers = subscribers.filter((s) => !s.appId || !NOTIFICATION_CHANNEL_APP_IDS.has(s.appId));

    if (notificationSubscribers.length > 0 && this.notificationDispatcher) {
      await this.dispatchToNotificationChannels(notificationSubscribers, eventData, payload);
    }

    if (httpSubscribers.length > 0) {
      this.log.debug("HTTP webhook delivery not implemented yet (Phase 1+)", {
        subscriberCount: httpSubscribers.length,
        triggerEvent: payload.triggerEvent,
      });
    }
  }

  private async dispatchToNotificationChannels(
    subscribers: WebhookSubscriber[],
    eventData: Record<string, unknown>,
    payload: WebhookTaskPayload
  ): Promise<void> {
    if (!this.notificationDispatcher) return;

    const event: NotificationEvent = {
      triggerEvent: payload.triggerEvent,
      payload: eventData,
      metadata: {
        userId: "userId" in payload ? (payload.userId as number) : undefined,
        teamId: "teamId" in payload ? (payload.teamId as number | null) : undefined,
        bookingId: "bookingId" in payload ? (payload.bookingId as number) : undefined,
        eventTypeId: "eventTypeId" in payload ? (payload.eventTypeId as number | null) : undefined,
        timestamp: new Date().toISOString(),
      },
    };

    const configs = subscribers.map((sub) => {
      let settings: Record<string, unknown> = {};
      if (sub.payloadTemplate) {
        try {
          settings = JSON.parse(sub.payloadTemplate) as Record<string, unknown>;
        } catch {
          this.log.warn(`Invalid payloadTemplate JSON for subscriber ${sub.id}`);
        }
      }

      return {
        channelType: sub.appId || "slack",
        destination: sub.subscriberUrl.replace("internal://slack/", ""),
        credentialId: 0,
        settings,
      };
    });

    const results = await this.notificationDispatcher.dispatch(event, configs);
    const failures = results.filter((r) => !r.success);

    if (failures.length > 0) {
      this.log.warn(`${failures.length} notification delivery failure(s)`, {
        triggerEvent: payload.triggerEvent,
        failures: failures.map((f) => ({ channelId: f.channelId, error: f.error })),
      });
    }
  }
}
