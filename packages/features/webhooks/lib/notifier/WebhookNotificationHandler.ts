import logger from "@calcom/lib/logger";

import type { WebhookEventDTO } from "../dto/types";
import { WebhookPayloadFactory } from "../factory/WebhookPayloadFactory";
import { WebhookService } from "../service/WebhookService";

const log = logger.getSubLogger({ prefix: ["[WebhookNotificationHandler]"] });

/**
 * Central handler that receives webhook triggers and coordinates the webhook notification flow.
 *
 * @description This handler acts as the main entry point for all webhook notifications,
 * orchestrating the process from trigger event to payload delivery to external endpoints.
 *
 * @responsibilities
 * - Receives webhook trigger events from various parts of the application
 * - Routes events to appropriate handlers based on trigger event type
 * - Coordinates the transformation from events to deliverable payloads
 * - Manages the notification dispatch process to webhook subscribers
 *
 * @example Basic webhook notification flow
 * ```typescript
 * const handler = new WebhookNotificationHandler();
 * await handler.handleNotification(
 *   bookingDTO, // DTO contains triggerEvent internally
 *   false // isDryRun
 * );
 * // Triggers the complete webhook notification pipeline
 * ```
 *
 * @see WebhookPayloadFactory For payload transformation logic
 */

export class WebhookNotificationHandler {
  private webhookService = new WebhookService();

  /**
   * Handles a webhook notification by processing the DTO and triggering webhooks
   * @param dto - The event data transfer object containing the trigger event
   * @param isDryRun - Whether this is a dry run
   */
  async handleNotification(dto: WebhookEventDTO, isDryRun = false): Promise<void> {
    const trigger = dto.triggerEvent;
    try {
      if (isDryRun) {
        log.debug(`Dry run mode - skipping webhook notification for: ${trigger}`);
        return;
      }

      const queryParams = {
        userId: dto.userId,
        eventTypeId: dto.eventTypeId,
        triggerEvent: trigger,
        teamId: dto.teamId,
        orgId: dto.orgId,
        oAuthClientId: dto.platformClientId,
      };

      log.debug(`Querying for webhook subscribers with params:`, queryParams);

      const subscribers = await this.webhookService.getSubscribers(queryParams);

      if (subscribers.length === 0) {
        log.debug(`No subscribers found for event: ${trigger}`, {
          bookingId: dto.bookingId,
          eventTypeId: dto.eventTypeId,
        });
        return;
      }

      const webhookPayload = WebhookPayloadFactory.createPayload(dto);

      await this.webhookService.processWebhooks(trigger, webhookPayload, subscribers);

      log.debug(`Successfully processed webhook notification: ${trigger}`, {
        subscriberCount: subscribers.length,
        bookingId: dto.bookingId,
      });
    } catch (error) {
      log.error(`Error handling webhook notification: ${trigger}`, {
        error: error instanceof Error ? error.message : String(error),
        bookingId: dto.bookingId,
        eventTypeId: dto.eventTypeId,
      });
      throw error;
    }
  }

  setWebhookService(service: WebhookService): void {
    this.webhookService = service;
  }
}
