import logger from "@calcom/lib/logger";

import type { WebhookEventDTO } from "../dto/types";

type WebhookHandlerLike = {
  handleNotification(dto: WebhookEventDTO, isDryRun?: boolean): Promise<void>;
};

const log = logger.getSubLogger({ prefix: ["[WebhookNotifier]"] });

export class WebhookNotifier {
  private static handler: WebhookHandlerLike;

  /**
   * Allows external injection of the handler (e.g., from Ioctopus container).
   */
  static setHandler(handler: WebhookHandlerLike): void {
    this.handler = handler;
  }

  static getHandler(): WebhookHandlerLike {
    if (!this.handler) {
      throw new Error("WebhookNotifier handler not initialized. Call WebhookNotifier.setHandler(...) first.");
    }
    return WebhookNotifier.handler;
  }

  static async emitWebhook(dto: WebhookEventDTO, isDryRun = false): Promise<void> {
    const trigger = dto.triggerEvent;

    try {
      log.debug(`Emitting webhook event: ${trigger}`, {
        bookingId: dto.bookingId,
        eventTypeId: dto.eventTypeId,
        isDryRun,
      });

      await this.getHandler().handleNotification(dto, isDryRun);

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
}
