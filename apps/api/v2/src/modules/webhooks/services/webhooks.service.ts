import { CreateWebhookInputDto } from "@/modules/webhooks/inputs/create-webhook.input";
import { WebhooksRepository } from "@/modules/webhooks/webhooks.repository";
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Webhook } from "@prisma/client";

@Injectable()
export class WebhooksService {
  constructor(private readonly webhooksRepository: WebhooksRepository) {}

  async createUserWebhook(userId: number, body: CreateWebhookInputDto): Promise<Webhook> {
    const existingWebhook = await this.webhooksRepository.getUserWebhookByUrl(userId, body.subscriberUrl);
    if (existingWebhook) {
      throw new ConflictException("Webhook with this subscriber url already exists for this user");
    }
    return this.webhooksRepository.createUserWebhook(userId, body);
  }

  async createEventTypeWebhook(eventTypeId: number, body: CreateWebhookInputDto): Promise<Webhook> {
    const existingWebhook = await this.webhooksRepository.getEventTypeWebhookByUrl(
      eventTypeId,
      body.subscriberUrl
    );
    if (existingWebhook) {
      throw new ConflictException("Webhook with this subscriber url already exists for this event type");
    }
    return this.webhooksRepository.createEventTypeWebhook(eventTypeId, body);
  }

  async updateWebhook(webhookId: string, body: Partial<CreateWebhookInputDto>): Promise<Webhook> {
    return this.webhooksRepository.updateWebhook(webhookId, body);
  }

  async getWebhookById(webhookId: string): Promise<Webhook> {
    const webhook = await this.webhooksRepository.getWebhookById(webhookId);
    if (!webhook) {
      throw new NotFoundException(`Webhook (${webhookId}) not found`);
    }
    return webhook;
  }

  getEventTypeWebhooksPaginated(eventTypeId: number, skip: number, take: number): Promise<Webhook[]> {
    return this.webhooksRepository.getEventTypeWebhooksPaginated(eventTypeId, skip, take);
  }

  async getUserWebhooksPaginated(userId: number, skip: number, take: number): Promise<Webhook[]> {
    return this.webhooksRepository.getUserWebhooksPaginated(userId, skip, take);
  }

  async deleteWebhook(webhookId: string): Promise<Webhook> {
    return this.webhooksRepository.deleteWebhook(webhookId);
  }
}
