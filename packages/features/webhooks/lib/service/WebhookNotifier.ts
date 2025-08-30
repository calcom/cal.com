import logger from "@calcom/lib/logger";

import type { WebhookEventDTO } from "../dto/types";
import type { IWebhookNotifier, IWebhookNotificationHandler } from "../interface/webhook";

const log = logger.getSubLogger({ prefix: ["[WebhookNotifier]"] });

export class WebhookNotifier implements IWebhookNotifier {
  constructor(private readonly handler: IWebhookNotificationHandler) {}

  async emitWebhook(dto: WebhookEventDTO, isDryRun = false): Promise<void> {
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
      throw error;
    }
  }
}
