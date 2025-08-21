import logger from "@calcom/lib/logger";

import type { WebhookEventDTO } from "../dto/types";
import { WebhookNotificationHandler } from "./WebhookNotificationHandler";

const log = logger.getSubLogger({ prefix: ["[WebhookNotifier]"] });

/**
 * Simple utility for emitting webhook events without disrupting the main application flow.
 *
 * @description This notifier provides a lightweight interface for triggering webhook events
 * throughout the application. It uses dependency injection to allow flexible handler implementations
 * while ensuring webhook failures never impact core business operations.
 *
 * @responsibilities
 * - Provides a simple API for emitting webhook events from any part of the application
 * - Accepts configurable handlers via dependency injection for testing and extensibility
 * - Ensures webhook processing errors are isolated and logged without throwing
 * - Maintains non-blocking behavior to preserve main application flow integrity
 *
 * @example Basic webhook emission
 * ```typescript
 * await WebhookNotifier.emitWebhook(dto, false);
 * // Webhook is processed asynchronously, errors are logged but not thrown
 * ```
 *
 * @example With custom handler for testing
 * ```typescript
 * const mockHandler = new MockWebhookHandler();
 * const previous = WebhookNotifier.getHandler();
 * WebhookNotifier.setHandler(mockHandler);
 * await WebhookNotifier.emitWebhook(dto, true); // isDryRun = true
 * WebhookNotifier.setHandler(previous); // Restore original handler
 * ```
 *
 * @throws Never - All errors are caught and logged to prevent disrupting main flow
 * @see WebhookNotificationHandler For the default webhook processing implementation
 */
export class WebhookNotifier {
  private static handler = new WebhookNotificationHandler();

  /**
   * Emits a webhook event using the DTO's trigger event
   * @param dto - The data transfer object containing event data and trigger
   * @param isDryRun - Whether this is a dry run (for testing)
   */
  static async emitWebhook(dto: WebhookEventDTO, isDryRun = false): Promise<void> {
    const trigger = dto.triggerEvent;
    try {
      log.debug(`Emitting webhook event: ${trigger}`, {
        bookingId: dto.bookingId,
        eventTypeId: dto.eventTypeId,
        isDryRun,
      });

      await this.handler.handleNotification(dto, isDryRun);

      log.debug(`Successfully emitted webhook event: ${trigger}`, {
        bookingId: dto.bookingId,
      });
    } catch (error) {
      log.error(`Failed to emit webhook event: ${trigger}`, {
        error: error instanceof Error ? error.message : String(error),
        bookingId: dto.bookingId,
        eventTypeId: dto.eventTypeId,
      });
    }
  }

  static setHandler(handler: WebhookNotificationHandler): void {
    this.handler = handler;
  }

  static getHandler(): WebhookNotificationHandler {
    return WebhookNotifier.handler;
  }
}
