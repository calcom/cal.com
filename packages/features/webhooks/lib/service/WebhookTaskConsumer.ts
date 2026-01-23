import type { IWebhookDataFetcher } from "../interface/IWebhookDataFetcher";
import type { IWebhookRepository } from "../interface/IWebhookRepository";
import type { ILogger } from "../interface/infrastructure";
import type { WebhookTaskPayload } from "../types/webhookTask";

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
    logger: ILogger
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

  /**
   * Build webhook payloads and send to each subscriber.
   *
   * TODO: Implement with PayloadBuilders and HTTP client (Phase 1+)
   */
  private async sendWebhooksToSubscribers(
    subscribers: unknown[],
    eventData: Record<string, unknown>,
    payload: WebhookTaskPayload
  ): Promise<void> {
    this.log.debug("Webhook sending not implemented yet (Phase 0 scaffold)", {
      subscriberCount: subscribers.length,
      triggerEvent: payload.triggerEvent,
    });
  }
}
