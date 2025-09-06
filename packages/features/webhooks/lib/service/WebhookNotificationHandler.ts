import logger from "@calcom/lib/logger";

import type { WebhookEventDTO } from "../dto/types";
import type { WebhookPayloadFactory } from "../factory/WebhookPayloadFactory";
import type { IWebhookService } from "../interface/services";
import type { IWebhookNotificationHandler } from "../interface/webhook";

const log = logger.getSubLogger({ prefix: ["[WebhookNotificationHandler]"] });

export class WebhookNotificationHandler implements IWebhookNotificationHandler {
  constructor(
    private readonly webhookService: IWebhookService,
    private readonly webhookPayloadFactory: WebhookPayloadFactory
  ) {}

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

      const webhookPayload = this.webhookPayloadFactory.createPayload(dto);

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
}
