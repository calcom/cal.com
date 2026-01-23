import { PipedInputWebhookType } from "@/modules/webhooks/pipes/WebhookInputPipe";
import { WebhooksRepository } from "@/modules/webhooks/webhooks.repository";
import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";

import { WebhookTriggerEvents } from "@calcom/prisma/enums";

@Injectable()
export class EventTypeWebhooksService {
  constructor(private readonly webhooksRepository: WebhooksRepository) {}

  async createEventTypeWebhook(eventTypeId: number, body: PipedInputWebhookType) {
    if (body.eventTriggers.includes(WebhookTriggerEvents.DELEGATION_CREDENTIAL_ERROR)) {
      throw new BadRequestException(
        "DELEGATION_CREDENTIAL_ERROR trigger is only available for organization webhooks"
      );
    }

    const existingWebhook = await this.webhooksRepository.getEventTypeWebhookByUrl(
      eventTypeId,
      body.subscriberUrl
    );
    if (existingWebhook) {
      throw new ConflictException("Webhook with this subscriber url already exists for this event type");
    }
    return this.webhooksRepository.createEventTypeWebhook(eventTypeId, {
      ...body,
      payloadTemplate: body.payloadTemplate ?? null,
      secret: body.secret ?? null,
    });
  }

  getEventTypeWebhooksPaginated(eventTypeId: number, skip: number, take: number) {
    return this.webhooksRepository.getEventTypeWebhooksPaginated(eventTypeId, skip, take);
  }

  async deleteAllEventTypeWebhooks(eventTypeId: number): Promise<{ count: number }> {
    return this.webhooksRepository.deleteAllEventTypeWebhooks(eventTypeId);
  }
}
