import { PipedInputWebhookType } from "@/modules/webhooks/pipes/WebhookInputPipe";
import { WebhooksRepository } from "@/modules/webhooks/webhooks.repository";
import { ConflictException, Injectable, Logger } from "@nestjs/common";

@Injectable()
export class EventTypeWebhooksService {
  private readonly logger = new Logger("EventTypeWebhooksService");

  constructor(private readonly webhooksRepository: WebhooksRepository) {}

  async createEventTypeWebhook(eventTypeId: number, body: PipedInputWebhookType) {
    const existingWebhook = await this.webhooksRepository.getEventTypeWebhookByUrl(
      eventTypeId,
      body.subscriberUrl
    );
    if (existingWebhook) {
      throw new ConflictException("Webhook with this subscriber url already exists for this event type");
    }
    const webhook = await this.webhooksRepository.createEventTypeWebhook(eventTypeId, {
      ...body,
      payloadTemplate: body.payloadTemplate ?? null,
      secret: body.secret ?? null,
    });
    this.logEvent('create', eventTypeId, webhook.id);
    return webhook;
  }

  getEventTypeWebhooksPaginated(eventTypeId: number, skip: number, take: number) {
    return this.webhooksRepository.getEventTypeWebhooksPaginated(eventTypeId, skip, take);
  }

  async deleteAllEventTypeWebhooks(eventTypeId: number): Promise<{ count: number }> {
    const result = await this.webhooksRepository.deleteAllEventTypeWebhooks(eventTypeId);
    this.logEvent('delete', eventTypeId, null);
    return result;
  }

  private logEvent(action: string, eventTypeId: number, webhookId: string | null) {
    const webhookIdText = webhookId ? `webhook ${webhookId}` : 'all webhooks';
    this.logger.log(`Performed ${action} action on ${webhookIdText} for event type ${eventTypeId}`);
  }
}
