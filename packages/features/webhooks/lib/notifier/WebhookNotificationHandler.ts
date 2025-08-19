import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
import logger from "@calcom/lib/logger";

import type { WebhookEventDTO, WebhookSubscriber } from "../dto/types";
import { WebhookPayloadFactory } from "../factory/WebhookPayloadFactory";
import { WebhookRepository } from "../repository/WebhookRepository";
import { WebhookService } from "../service/WebhookService";

const log = logger.getSubLogger({ prefix: ["[WebhookNotificationHandler]"] });

/**
 * Central handler that receives webhook triggers and coordinates the webhook flow
 * Responsible for selecting appropriate logic based on trigger event type
 */
export class WebhookNotificationHandler {
  private repository = new WebhookRepository();
  private webhookService = new WebhookService();

  /**
   * Handles a webhook notification by processing the DTO and triggering webhooks
   * @param trigger - The webhook trigger event
   * @param dto - The event data transfer object
   * @param isDryRun - Whether this is a dry run
   */
  async handleNotification(trigger: WebhookTriggerEvents, dto: WebhookEventDTO, isDryRun = false): Promise<void> {
    try {
      if (isDryRun) {
        log.debug(`Dry run mode - skipping webhook notification for: ${trigger}`);
        return;
      }

      // Get subscribers for this event
      const subscribers = await this.getSubscribersForEvent(trigger, dto);
      
      if (subscribers.length === 0) {
        log.debug(`No subscribers found for event: ${trigger}`, {
          bookingId: dto.bookingId,
          eventTypeId: dto.eventTypeId,
        });
        return;
      }

      // Create webhook payload using factory
      const webhookPayload = WebhookPayloadFactory.createPayload(dto);

      // Delegate to webhook service for delivery
      await this.webhookService.processWebhooks(
        trigger,
        webhookPayload,
        subscribers
      );

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

  /**
   * Gets subscribers for a specific webhook event
   */
  private async getSubscribersForEvent(
    trigger: WebhookTriggerEvents,
    dto: WebhookEventDTO
  ): Promise<WebhookSubscriber[]> {
    const criteria = {
      userId: dto.userId,
      eventTypeId: dto.eventTypeId,
      triggerEvent: trigger,
      teamId: dto.teamId,
      orgId: dto.orgId,
      oAuthClientId: dto.platformClientId,
    };

    return this.repository.getSubscribers(criteria);
  }

  /**
   * Sets a custom repository (useful for testing)
   */
  setRepository(repository: WebhookRepository): void {
    this.repository = repository;
  }

  /**
   * Sets a custom webhook service (useful for testing)
   */
  setWebhookService(service: WebhookService): void {
    this.webhookService = service;
  }
}
