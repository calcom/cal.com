import type { WebhookEventDTO } from "../dto/types";
import type { ILogger } from "../interface/infrastructure";
import type { IWebhookNotifier, IWebhookNotificationHandler } from "../interface/webhook";

export class WebhookNotifier implements IWebhookNotifier {
  private readonly log: ILogger;

  constructor(private readonly handler: IWebhookNotificationHandler, logger: ILogger) {
    this.log = logger.getSubLogger({ prefix: ["[WebhookNotifier]"] });
  }

  async emitWebhook(dto: WebhookEventDTO, isDryRun = false): Promise<void> {
    const trigger = dto.triggerEvent;

    try {
      this.log.debug(`Emitting webhook event: ${trigger}`, {
        bookingId: dto.bookingId,
        eventTypeId: dto.eventTypeId,
        isDryRun,
      });

      await this.handler.handleNotification(dto, isDryRun);

      this.log.debug(`Successfully emitted webhook event: ${trigger}`, {
        bookingId: dto.bookingId,
      });
    } catch (error) {
      this.log.error(`Failed to emit webhook event: ${trigger}`, {
        error: error instanceof Error ? error.message : String(error),
        bookingId: dto.bookingId,
        eventTypeId: dto.eventTypeId,
      });
      throw error;
    }
  }
}
