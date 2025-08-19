import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import type { WebhookSubscriber, WebhookDeliveryResult } from "../dto/types";
import type { WebhookPayload } from "../factory/WebhookPayloadFactory";
import { WebhookDeliveryService } from "../delivery/WebhookDeliveryService";
import sendOrSchedulePayload from "../sendOrSchedulePayload";

const log = logger.getSubLogger({ prefix: ["[WebhookService]"] });

export interface WebhookServiceOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  rateLimitPerSecond?: number;
}

/**
 * Service that handles webhook processing including rate-limiting, retry logic, and filtering
 * Coordinates with WebhookDeliveryService to log success/failure
 */
export class WebhookService {
  private deliveryService = new WebhookDeliveryService();
  private options: Required<WebhookServiceOptions>;

  constructor(options: WebhookServiceOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000, // 1 second
      timeout: options.timeout ?? 30000, // 30 seconds
      rateLimitPerSecond: options.rateLimitPerSecond ?? 10,
    };
  }

  /**
   * Processes webhooks for a given trigger and payload
   * Handles rate-limiting, retry logic, filtering, and delivery logging
   */
  async processWebhooks(
    trigger: WebhookTriggerEvents,
    payload: WebhookPayload,
    subscribers: WebhookSubscriber[]
  ): Promise<void> {
    if (subscribers.length === 0) {
      log.debug(`No subscribers to process for trigger: ${trigger}`);
      return;
    }

    log.debug(`Processing ${subscribers.length} webhooks for trigger: ${trigger}`);

    // Filter subscribers that support this trigger event
    const validSubscribers = this.filterSubscribers(subscribers, trigger);
    
    if (validSubscribers.length === 0) {
      log.debug(`No valid subscribers found for trigger: ${trigger}`);
      return;
    }

    // Apply rate limiting by processing subscribers in batches
    const batches = this.createBatches(validSubscribers, this.options.rateLimitPerSecond);
    
    for (const batch of batches) {
      await this.processBatch(trigger, payload, batch);
      
      // Add delay between batches for rate limiting
      if (batches.length > 1) {
        await this.delay(1000); // 1 second between batches
      }
    }

    log.debug(`Completed processing webhooks for trigger: ${trigger}`, {
      totalSubscribers: subscribers.length,
      validSubscribers: validSubscribers.length,
      batches: batches.length,
    });
  }

  /**
   * Filters subscribers to only include those that support the trigger event
   */
  private filterSubscribers(
    subscribers: WebhookSubscriber[],
    trigger: WebhookTriggerEvents
  ): WebhookSubscriber[] {
    return subscribers.filter((subscriber) => {
      // Check if subscriber supports this trigger
      if (!subscriber.eventTriggers.includes(trigger)) {
        log.debug(`Subscriber ${subscriber.id} does not support trigger ${trigger}`);
        return false;
      }

      // Validate subscriber URL
      if (!subscriber.subscriberUrl) {
        log.warn(`Subscriber ${subscriber.id} has no subscriberUrl`);
        return false;
      }

      return true;
    });
  }

  /**
   * Creates batches of subscribers for rate limiting
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Processes a batch of subscribers concurrently
   */
  private async processBatch(
    trigger: WebhookTriggerEvents,
    payload: WebhookPayload,
    subscribers: WebhookSubscriber[]
  ): Promise<void> {
    const promises = subscribers.map((subscriber) =>
      this.processWebhookWithRetry(trigger, payload, subscriber)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Processes a single webhook with retry logic
   */
  private async processWebhookWithRetry(
    trigger: WebhookTriggerEvents,
    payload: WebhookPayload,
    subscriber: WebhookSubscriber,
    attempt = 1
  ): Promise<void> {
    const startTime = Date.now();

    try {
      log.debug(`Sending webhook to ${subscriber.subscriberUrl} (attempt ${attempt})`, {
        trigger,
        webhookId: subscriber.id,
      });

      const result = await this.sendWebhook(trigger, payload, subscriber);
      const duration = Date.now() - startTime;

      if (result.ok) {
        await this.deliveryService.logSuccess(
          subscriber,
          trigger,
          result,
          JSON.stringify(payload),
          duration
        );
        log.debug(`Webhook delivered successfully to ${subscriber.subscriberUrl}`, {
          trigger,
          webhookId: subscriber.id,
          statusCode: result.status,
          duration,
        });
      } else {
        throw new Error(`HTTP ${result.status}: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      log.error(`Webhook delivery failed to ${subscriber.subscriberUrl} (attempt ${attempt})`, {
        trigger,
        webhookId: subscriber.id,
        error: errorMessage,
        duration,
      });

      // Retry logic
      if (attempt < this.options.maxRetries) {
        log.debug(`Retrying webhook delivery to ${subscriber.subscriberUrl}`, {
          trigger,
          webhookId: subscriber.id,
          nextAttempt: attempt + 1,
          maxRetries: this.options.maxRetries,
        });

        await this.delay(this.options.retryDelay * attempt); // Exponential backoff
        return this.processWebhookWithRetry(trigger, payload, subscriber, attempt + 1);
      }

      // Log final failure
      await this.deliveryService.logFailure(
        subscriber,
        trigger,
        JSON.stringify(payload),
        error,
        undefined,
        duration
      );
    }
  }

  /**
   * Sends a webhook using the existing sendOrSchedulePayload function
   */
  private async sendWebhook(
    trigger: WebhookTriggerEvents,
    payload: WebhookPayload,
    subscriber: WebhookSubscriber
  ): Promise<WebhookDeliveryResult> {
    const result = await sendOrSchedulePayload(
      subscriber.secret,
      trigger,
      payload.createdAt,
      {
        subscriberUrl: subscriber.subscriberUrl,
        appId: subscriber.appId,
        payloadTemplate: subscriber.payloadTemplate,
      },
      payload.payload
    );

    return {
      ok: result.ok,
      status: result.status,
      message: result.message,
      subscriberUrl: subscriber.subscriberUrl,
      webhookId: subscriber.id,
    };
  }

  /**
   * Utility function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Sets a custom delivery service (useful for testing)
   */
  setDeliveryService(service: WebhookDeliveryService): void {
    this.deliveryService = service;
  }

  /**
   * Gets the current options
   */
  getOptions(): Required<WebhookServiceOptions> {
    return { ...this.options };
  }
}
