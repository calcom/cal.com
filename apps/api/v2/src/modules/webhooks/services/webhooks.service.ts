import { CreateUserWebhookInputDto } from "@/modules/webhooks/inputs/create-user-webhook.input";
import { WebhooksRepository } from "@/modules/webhooks/webhooks.repository";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Webhook } from "@prisma/client";

@Injectable()
export class WebhooksService {
  constructor(private readonly webhooksRepository: WebhooksRepository) {}

  async createUserWebhook(userId: number, body: CreateUserWebhookInputDto): Promise<Webhook> {
    return this.webhooksRepository.createUserWebhook(userId, body);
  }

  async updateWebhook(webhookId: string, body: Partial<CreateUserWebhookInputDto>): Promise<Webhook> {
    return this.webhooksRepository.updateWebhook(webhookId, body);
  }

  async getWebhookById(webhookId: string): Promise<Webhook> {
    const webhook = await this.webhooksRepository.getWebhookById(webhookId);
    if (!webhook) {
      throw new NotFoundException(`Webhook (${webhookId}) not found`);
    }
    return webhook;
  }

  async getUserWebhooksPaginated(userId: number, skip: number, take: number): Promise<Webhook[]> {
    return this.webhooksRepository.getUserWebhooksPaginated(userId, skip, take);
  }

  async deleteWebhook(webhookId: string): Promise<Webhook> {
    return this.webhooksRepository.deleteWebhook(webhookId);
  }
}
