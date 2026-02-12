import { DEFAULT_WEBHOOK_VERSION } from "../interface/IWebhookRepository";
import type { WebhookEventDTO } from "../dto/types";
import type { WebhookPayload } from "../factory/types";
import type { PayloadBuilderFactory } from "../factory/versioned/PayloadBuilderFactory";
import type { ILogger } from "../interface/infrastructure";
import type { IWebhookService } from "../interface/services";
import type { IWebhookNotificationHandler } from "../interface/webhook";
import type { WebhookVersion } from "../interface/IWebhookRepository";

export class WebhookNotificationHandler implements IWebhookNotificationHandler {
  private readonly log: ILogger;

  constructor(
    private readonly webhookService: IWebhookService,
    private readonly payloadBuilderFactory: PayloadBuilderFactory,
    logger: ILogger
  ) {
    this.log = logger.getSubLogger({ prefix: ["[WebhookNotificationHandler]"] });
  }

  async handleNotification(dto: WebhookEventDTO, isDryRun = false): Promise<void> {
    const trigger = dto.triggerEvent;

    try {
      if (isDryRun) {
        this.log.debug(`Dry run mode - skipping webhook notification for: ${trigger}`);
        return;
      }

      const subscriptionParams = {
        userId: dto.userId,
        eventTypeId: dto.eventTypeId,
        triggerEvent: trigger,
        teamId: dto.teamId,
        orgId: dto.orgId,
        oAuthClientId: dto.platformClientId,
      };

      this.log.debug(`Querying for webhook subscribers with params:`, subscriptionParams);

      const subscribers = await this.webhookService.getSubscribers(subscriptionParams);

      if (subscribers.length === 0) {
        this.log.debug(`No subscribers found for event: ${trigger}`, {
          bookingId: dto.bookingId,
          eventTypeId: dto.eventTypeId,
        });
        return;
      }

      const webhookPayload = this.createPayload(dto);

      await this.webhookService.processWebhooks(trigger, webhookPayload, subscribers);

      this.log.debug(`Successfully processed webhook notification: ${trigger}`, {
        subscriberCount: subscribers.length,
        bookingId: dto.bookingId,
      });
    } catch (error) {
      this.log.error(`Error handling webhook notification: ${trigger}`, {
        error: error instanceof Error ? error.message : String(error),
        bookingId: dto.bookingId,
        eventTypeId: dto.eventTypeId,
      });
      throw error;
    }
  }

  /**
   * Create webhook payload using version-specific builder from factory.
   *
   * All event types now go through the factory for consistent versioning.
   *
   * Note: Currently uses DEFAULT version for all subscribers.
   * In the future, this can be enhanced to:
   * 1. Accept subscriber version parameter
   * 2. Build version-specific payloads per subscriber
   * 3. Group subscribers by version for efficiency
   */
  private createPayload(
    dto: WebhookEventDTO,
    version: WebhookVersion = DEFAULT_WEBHOOK_VERSION
  ): WebhookPayload {
    // Get version-specific builder from factory - handles all event types
    const builder = this.payloadBuilderFactory.getBuilder(version, dto.triggerEvent);
    return builder.build(dto);
  }
}
