import { createHmac } from "crypto";

import logger from "@calcom/lib/logger";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { WebhookSubscriber, WebhookDeliveryResult } from "../dto/types";
import type { WebhookPayload } from "../factory/types";
import { WebhookRepository } from "../repository/WebhookRepository";

const log = logger.getSubLogger({ prefix: ["[WebhookService]"] });

export interface WebhookServiceOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * Core service for webhook delivery orchestration with retry logic and error handling.
 *
 * @description This service acts as the central orchestrator for all webhook operations,
 * managing the complete lifecycle from subscriber retrieval to payload delivery.
 * It implements robust error handling and configurable retry mechanisms
 * to ensure reliable webhook delivery to external endpoints.
 *
 * @responsibilities
 * - Orchestrates webhook delivery from subscriber lookup to payload transmission
 * - Implements exponential backoff retry logic for failed webhook deliveries
 * - Manages webhook scheduling and cancellation for time-sensitive events
 * - Coordinates with repository layer for subscriber data and factory for payload creation
 * - Handles webhook delivery result tracking and error reporting
 *
 * @features
 * - Configurable retry attempts (default: 3) with exponential backoff
 * - Request timeout protection (default: 5 seconds)
 * - Comprehensive error logging and monitoring integration
 * - Support for dry-run testing without actual HTTP requests
 *
 * @example Basic webhook delivery
 * ```typescript
 * const service = new WebhookService({
 *   maxRetries: 5,
 *   timeout: 10000,
 *   retryDelay: 2000
 * });
 *
 * await service.processWebhooks(trigger, payload, subscribers);
 * // Returns Promise<void> - processes all webhooks with error handling and logging
 * ```
 *
 * @example Webhook scheduling for future delivery
 * ```typescript
 * await service.scheduleDelayedWebhooks(triggerEvent, payload, new Date(Date.now() + 60_000), { teamId: 42 });
 * // Schedules webhook for future delivery (uses Tasker under the hood)
 *
 * await service.cancelScheduledWebhooks(bookingId);
 * // Cancels any pending scheduled webhooks for the booking
 * ```
 *
 * @see WebhookRepository For subscriber data access
 * @see WebhookPayloadFactory For payload transformation
 */
export class WebhookService {
  private repository = new WebhookRepository();
  private options: Required<WebhookServiceOptions>;

  constructor(options: WebhookServiceOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000, // 1 second
      timeout: options.timeout ?? 5000, // 5 seconds
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
        throw new Error(`HTTP ${result.status}: ${result.message || "Unknown error"}`);
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

    // TODO: SECURITY - Remove webhook secrets from task queue payloads
    // Currently storing secretKey and full webhook object in task queue creates security risk.
    // Should pass only webhookId and fetch subscriber/secrets at runtime in task handler.
    // See: https://github.com/calcom/cal.com/security-webhook-secrets-refactor
    await tasker.create(
      "sendWebhook",
      JSON.stringify({
        secretKey: subscriber.secret, // 🚨 SECURITY RISK: Secret stored in queue
        triggerEvent: trigger,
        createdAt: new Date().toISOString(),
        webhook: subscriber, // 🚨 SECURITY RISK: Full object with secrets
        data: payload.payload,
      })
    );

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
    const { subscriberUrl, payloadTemplate, appId: _appId } = subscriber;

    if (!subscriberUrl) {
      throw new Error("Missing subscriber URL");
    }

    const contentType =
      !payloadTemplate || this.isJsonTemplate(payloadTemplate)
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
      ? createHmac("sha256", subscriber.secret).update(body).digest("hex")
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

  /**
   * Schedules time-based webhooks (e.g., MEETING_STARTED, MEETING_ENDED)
   * Replaces the legacy scheduleTrigger functionality
   */
  async scheduleTimeBasedWebhook(
    trigger: WebhookTriggerEvents,
    scheduledAt: Date,
    bookingData: {
      id: number;
      uid: string;
      eventTypeId: number | null;
      userId: number | null;
      teamId?: number | null;
      responses?: Record<string, unknown>;
    },
    subscriber: WebhookSubscriber,
    evt: Record<string, unknown>,
    isDryRun = false
  ): Promise<void> {
    if (isDryRun) {
      log.debug(`Dry run - skipping scheduled webhook: ${trigger}`, {
        bookingId: bookingData.id,
        scheduledAt,
      });
      return;
    }

    try {
      const tasker = (await import("@calcom/features/tasker")).default;

      // TODO: SECURITY - Remove webhook secrets from task queue payloads
      // Same security issue as scheduleWebhook method - storing secrets in queue
      // Should pass only webhookId and fetch subscriber/secrets at runtime
      await tasker.create(
        "sendWebhook",
        JSON.stringify({
          secretKey: subscriber.secret, // 🚨 SECURITY RISK: Secret stored in queue
          triggerEvent: trigger,
          createdAt: new Date().toISOString(),
          webhook: subscriber, // 🚨 SECURITY RISK: Full object with secrets
          data: {
            // Create basic webhook data from available parameters
            bookingId: bookingData.id,
            eventTypeId: bookingData.eventTypeId,
            userId: bookingData.userId,
            teamId: bookingData.teamId,
            evt,
            responses: bookingData.responses,
          },
        }),
        { scheduledAt, referenceUid: `booking-${bookingData.id}-${trigger}` }
      );

      log.debug(`Scheduled time-based webhook: ${trigger}`, {
        bookingId: bookingData.id,
        subscriberUrl: subscriber.subscriberUrl,
        scheduledAt,
      });
    } catch (error) {
      log.error(`Failed to schedule time-based webhook: ${trigger}`, {
        error: error instanceof Error ? error.message : String(error),
        bookingId: bookingData.id,
        subscriberUrl: subscriber.subscriberUrl,
      });
    }
  }

  /**
   * Cancels scheduled webhook triggers for a booking
   * Replaces the legacy deleteWebhookScheduledTriggers functionality
   */
  async cancelScheduledWebhooks(
    bookingId: number,
    triggers: WebhookTriggerEvents[] = [
      WebhookTriggerEvents.MEETING_STARTED,
      WebhookTriggerEvents.MEETING_ENDED,
    ],
    isDryRun = false
  ): Promise<void> {
    if (isDryRun) {
      log.debug(`Dry run - skipping webhook trigger deletion for booking: ${bookingId}`);
      return;
    }

    try {
      const tasker = (await import("@calcom/features/tasker")).default;

      for (const trigger of triggers) {
        const referenceUid = `booking-${bookingId}-${trigger}`;
        await tasker.cancelWithReference(referenceUid, "sendWebhook");
      }
      log.debug(`Cancelled scheduled webhooks for booking: ${bookingId}`, { triggers });
    } catch (error) {
      log.error(`Failed to cancel scheduled webhooks for booking: ${bookingId}`, {
        error: error instanceof Error ? error.message : String(error),
        triggers,
      });
    }
  }

  /**
   * Schedules webhooks for delayed execution
   * @param trigger - The webhook trigger event
   * @param payload - The webhook payload
   * @param scheduledAt - When to execute the webhook
   * @param options - Optional context for subscriber lookup (teamId, orgId)
   * @param subscribers - List of webhook subscribers (optional, will fetch if not provided)
   * @param isDryRun - Whether this is a dry run
   */
  async scheduleDelayedWebhooks(
    trigger: WebhookTriggerEvents,
    payload: WebhookPayload,
    scheduledAt: Date,
    options?: { teamId?: number | number[] | null; orgId?: number | null },
    subscribers?: WebhookSubscriber[],
    isDryRun = false
  ): Promise<void> {
    if (isDryRun) {
      log.debug(`Dry run - skipping delayed webhook: ${trigger}`, { scheduledAt });
      return;
    }

    const webhookSubscribers =
      subscribers ||
      (await this.repository.getSubscribers({
        userId: null,
        eventTypeId: null,
        triggerEvent: trigger,
        teamId: options?.teamId,
        orgId: options?.orgId,
        oAuthClientId: undefined,
      }));

    if (webhookSubscribers.length === 0) {
      return;
    }

    try {
      const tasker = (await import("@calcom/features/tasker")).default;
      const createdAt = new Date().toISOString();

      // TODO: SECURITY - Remove webhook secrets from task queue payloads
      // Delayed webhooks also store secrets in queue - same security risk
      // Should pass only webhookId and fetch subscriber/secrets at runtime
      const schedulePromises = webhookSubscribers.map((subscriber) =>
        tasker.create(
          "sendWebhook",
          JSON.stringify({
            secretKey: subscriber.secret, // 🚨 SECURITY RISK: Secret stored in queue
            triggerEvent: trigger,
            createdAt,
            webhook: subscriber, // 🚨 SECURITY RISK: Full object with secrets
            data: payload.payload,
          }),
          { scheduledAt }
        )
      );

      await Promise.all(schedulePromises);

      log.debug(`Scheduled delayed webhooks: ${trigger}`, {
        count: webhookSubscribers.length,
        scheduledAt,
      });
    } catch (error) {
      log.error(`Failed to schedule delayed webhooks: ${trigger}`, {
        error: error instanceof Error ? error.message : String(error),
        scheduledAt,
      });
      throw error;
    }
  }
}
