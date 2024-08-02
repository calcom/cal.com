import { CreateWebhookInputDto } from "@/modules/webhooks/inputs/create-webhook.input";
import { WebhooksRepository } from "@/modules/webhooks/webhooks.repository";
import { Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class WebhooksService {
  constructor(private readonly webhooksRepository: WebhooksRepository) {}

  async updateWebhook(webhookId: string, body: Partial<CreateWebhookInputDto>) {
    return this.webhooksRepository.updateWebhook(webhookId, body);
  }

  async getWebhookById(webhookId: string) {
    const webhook = await this.webhooksRepository.getWebhookById(webhookId);
    if (!webhook) {
      throw new NotFoundException(`Webhook (${webhookId}) not found`);
    }
    return webhook;
  }

  async deleteWebhook(webhookId: string) {
    return this.webhooksRepository.deleteWebhook(webhookId);
  }
}
