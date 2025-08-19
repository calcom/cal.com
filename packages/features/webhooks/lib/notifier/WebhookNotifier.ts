import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
import logger from "@calcom/lib/logger";

import type { WebhookEventDTO } from "../dto/types";
import { WebhookNotificationHandler } from "./WebhookNotificationHandler";

const log = logger.getSubLogger({ prefix: ["[WebhookNotifier]"] });

/**
 * Simple utility for emitting webhook events
 * Uses dependency injection for flexibility in testing or extending behavior
 */
export class WebhookNotifier {
  private static handler = new WebhookNotificationHandler();

  /**
   * Emits a webhook event with the given trigger and DTO
   * @param trigger - The webhook trigger event type
   * @param dto - The data transfer object containing event data
   * @param isDryRun - Whether this is a dry run (for testing)
   */
  static async emitWebhook(trigger: WebhookTriggerEvents, dto: WebhookEventDTO, isDryRun = false): Promise<void> {
    try {
      log.debug(`Emitting webhook event: ${trigger}`, { 
        bookingId: dto.bookingId,
        eventTypeId: dto.eventTypeId,
        isDryRun 
      });

      await this.handler.handleNotification(trigger, dto, isDryRun);

      log.debug(`Successfully emitted webhook event: ${trigger}`, { 
        bookingId: dto.bookingId 
      });
    } catch (error) {
      log.error(`Failed to emit webhook event: ${trigger}`, {
        error: error instanceof Error ? error.message : String(error),
        bookingId: dto.bookingId,
        eventTypeId: dto.eventTypeId,
      });
      // Don't throw - webhook failures shouldn't break the main flow
    }
  }

  /**
   * Sets a custom notification handler (useful for testing)
   */
  static setHandler(handler: WebhookNotificationHandler): void {
    this.handler = handler;
  }

  /**
   * Gets the current notification handler
   */
  static getHandler(): WebhookNotificationHandler {
    return this.handler;
  }
}
