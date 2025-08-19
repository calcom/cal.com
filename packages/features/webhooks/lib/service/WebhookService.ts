import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
import logger from "@calcom/lib/logger";

import type { WebhookSubscriber, WebhookDeliveryResult } from "../dto/types";
import type { WebhookPayload } from "../factory/WebhookPayloadFactory";
import { WebhookRepository } from "../repository/WebhookRepository";

const log = logger.getSubLogger({ prefix: ["[WebhookService]"] });

export interface WebhookServiceOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  rateLimitPerSecond?: number;
}

/**
 * Service that handles webhook processing and repository interactions
 * All webhook delivery goes through this service
 */
export class WebhookService {
  private repository = new WebhookRepository();
  private options: Required<WebhookServiceOptions>;

  constructor(options: WebhookServiceOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000, // 1 second
      timeout: options.timeout ?? 5000, // 5 seconds
      rateLimitPerSecond: options.rateLimitPerSecond ?? 10,
    };
  }

  /**
   * Processes a single webhook with retry logic
   */
  protected async processWebhookWithRetry(
    trigger: WebhookTriggerEvents,
    payload: WebhookPayload,
    subscriber: WebhookSubscriber,
    attempt = 1
  ): Promise<void> {
    const startTime = Date.now();

    try {
      log.debug(`Attempting webhook delivery (attempt ${attempt}/${this.options.maxRetries})`, {
        subscriberUrl: subscriber.subscriberUrl,
        webhookId: subscriber.id,
        trigger,
      });

      const result = await this.sendWebhook(trigger, payload, subscriber);
      const duration = Date.now() - startTime;

      if (result.ok) {
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

      log.warn(`Webhook delivery attempt ${attempt} failed`, {
        subscriberUrl: subscriber.subscriberUrl,
        webhookId: subscriber.id,
        trigger,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      if (attempt < this.options.maxRetries) {
        log.debug(`Retrying webhook delivery in ${this.options.retryDelay * attempt}ms`);
        await this.delay(this.options.retryDelay * attempt); // Exponential backoff
        return this.processWebhookWithRetry(trigger, payload, subscriber, attempt + 1);
      }

      // Log final failure
      log.error(`Webhook delivery failed after ${this.options.maxRetries} attempts`, {
        subscriberUrl: subscriber.subscriberUrl,
        webhookId: subscriber.id,
        trigger,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });
    }
  }

  /**
   * Sends a webhook directly or schedules it via tasker
   * Contains the logic from sendOrSchedulePayload without importing it
   */
  protected async sendWebhook(
    trigger: WebhookTriggerEvents,
    payload: WebhookPayload,
    subscriber: WebhookSubscriber
  ): Promise<WebhookDeliveryResult> {
    try {
      // If Tasker is enabled, schedule the payload instead of sending it immediately
      if (process.env.TASKER_ENABLE_WEBHOOKS === "1") {
        return await this.scheduleWebhook(trigger, payload, subscriber);
      } else {
        return await this.sendWebhookDirectly(trigger, payload, subscriber);
      }
    } catch (error) {
      return {
        ok: false,
        status: 0,
        message: error instanceof Error ? error.message : String(error),
        duration: 0,
        subscriberUrl: subscriber.subscriberUrl,
        webhookId: subscriber.id,
      };
    }
  }

  /**
   * Schedules webhook via tasker (equivalent to schedulePayload)
   */
  private async scheduleWebhook(
    trigger: WebhookTriggerEvents,
    payload: WebhookPayload,
    subscriber: WebhookSubscriber
  ): Promise<WebhookDeliveryResult> {
    const tasker = (await import("@calcom/features/tasker")).default;
    
    await tasker.create("sendWebhook", JSON.stringify({
      secretKey: subscriber.secret,
      triggerEvent: trigger,
      createdAt: new Date().toISOString(),
      webhook: subscriber,
      data: payload.payload
    }));

    return {
      ok: true,
      status: 200,
      message: "Webhook scheduled successfully",
      duration: 0,
      subscriberUrl: subscriber.subscriberUrl,
      webhookId: subscriber.id,
    };
  }

  /**
   * Sends webhook directly via HTTP (equivalent to sendPayload)
   */
  private async sendWebhookDirectly(
    trigger: WebhookTriggerEvents,
    payload: WebhookPayload,
    subscriber: WebhookSubscriber
  ): Promise<WebhookDeliveryResult> {
    const { subscriberUrl, payloadTemplate, appId } = subscriber;
    
    if (!subscriberUrl) {
      throw new Error("Missing subscriber URL");
    }

    const contentType = !payloadTemplate || this.isJsonTemplate(payloadTemplate) 
      ? "application/json" 
      : "application/x-www-form-urlencoded";

    // Build the request body
    const body = JSON.stringify({
      triggerEvent: trigger,
      createdAt: payload.createdAt,
      payload: payload.payload,
    });

    // Create signature
    const signature = subscriber.secret 
      ? require("crypto").createHmac("sha256", subscriber.secret).update(body).digest("hex")
      : "no-secret-provided";

    // Send HTTP request
    const response = await fetch(subscriberUrl, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        "X-Cal-Signature-256": signature,
      },
      redirect: "manual",
      body,
    });

    const responseText = await response.text();

    return {
      ok: response.ok,
      status: response.status,
      message: responseText || undefined,
      duration: 0,
      subscriberUrl: subscriber.subscriberUrl,
      webhookId: subscriber.id,
    };
  }

  /**
   * Helper to check if template is JSON
   */
  private isJsonTemplate(template: string | null): boolean {
    if (!template) return true;
    try {
      JSON.parse(template);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Utility method to introduce delays (for retry logic)
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Gets subscribers for a webhook event through the repository
   */
  async getSubscribers(options: {
    userId?: number | null;
    eventTypeId?: number | null;
    triggerEvent: WebhookTriggerEvents;
    teamId?: number | number[] | null;
    orgId?: number | null;
    oAuthClientId?: string | null;
  }): Promise<WebhookSubscriber[]> {
    return this.repository.getSubscribers(options);
  }

  /**
   * Processes webhooks for multiple subscribers
   */
  async processWebhooks(
    trigger: WebhookTriggerEvents,
    payload: WebhookPayload,
    subscribers: WebhookSubscriber[]
  ): Promise<void> {
    const promises = subscribers.map((subscriber) =>
      this.processWebhookWithRetry(trigger, payload, subscriber).catch((error) => {
        log.error(`Webhook delivery failed for subscriber: ${subscriber.subscriberUrl}`, {
          error: error instanceof Error ? error.message : String(error),
          trigger,
          webhookId: subscriber.id,
        });
      })
    );

    await Promise.all(promises);
  }

  /**
   * Gets the current options
   */
  getOptions(): Required<WebhookServiceOptions> {
    return { ...this.options };
  }

  /**
   * Sets a custom repository (useful for testing)
   */
  setRepository(repository: WebhookRepository): void {
    this.repository = repository;
  }
}
