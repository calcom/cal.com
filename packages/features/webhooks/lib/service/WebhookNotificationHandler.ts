import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { WebhookEventDTO, DelegationCredentialErrorPayloadType } from "../dto/types";
import type { WebhookPayload } from "../factory/types";
import type { PayloadBuilderFactory } from "../factory/versioned/PayloadBuilderFactory";
import type { ILogger } from "../interface/infrastructure";
import type { IWebhookService } from "../interface/services";
import type { IWebhookNotificationHandler } from "../interface/webhook";

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
   * Create webhook payload using version-specific builder from factory
   *
   * Note: Currently uses DEFAULT version for all subscribers.
   * In the future, this can be enhanced to:
   * 1. Accept subscriber version parameter
   * 2. Build version-specific payloads per subscriber
   * 3. Group subscribers by version for efficiency
   */
  private createPayload(dto: WebhookEventDTO, version: string = "2021-10-20"): WebhookPayload {
    // Special handling for events that don't use builders
    if (
      dto.triggerEvent === WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW ||
      dto.triggerEvent === WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW
    ) {
      return {
        triggerEvent: dto.triggerEvent,
        createdAt: dto.createdAt,
        payload: {
          bookingId: dto.bookingId,
          webhook: dto.webhook,
        },
      };
    }

    if (dto.triggerEvent === WebhookTriggerEvents.DELEGATION_CREDENTIAL_ERROR) {
      const payload: DelegationCredentialErrorPayloadType = {
        error: dto.error,
        credential: dto.credential,
        user: dto.user,
      };
      return {
        triggerEvent: dto.triggerEvent,
        createdAt: dto.createdAt,
        payload,
      };
    }

    // Get version-specific builder from factory
    const builder = this.payloadBuilderFactory.getBuilder(version, dto.triggerEvent);
    return builder.build(dto);
  }
}
