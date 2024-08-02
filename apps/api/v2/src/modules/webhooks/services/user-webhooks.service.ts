import { CreateWebhookInputDto } from "@/modules/webhooks/inputs/create-webhook.input";
import { WebhooksRepository } from "@/modules/webhooks/webhooks.repository";
import { ConflictException, Injectable } from "@nestjs/common";

@Injectable()
export class UserWebhooksService {
  constructor(private readonly webhooksRepository: WebhooksRepository) {}

  async createUserWebhook(userId: number, body: CreateWebhookInputDto) {
    const existingWebhook = await this.webhooksRepository.getUserWebhookByUrl(userId, body.subscriberUrl);
    if (existingWebhook) {
      throw new ConflictException("Webhook with this subscriber url already exists for this user");
    }

    return this.webhooksRepository.createUserWebhook(userId, {
      ...body,
      payloadTemplate: body.payloadTemplate ?? null,
      active: body.active ?? true,
      secret: body.secret ?? null,
    });
  }

  async getUserWebhooksPaginated(userId: number, skip: number, take: number) {
    return this.webhooksRepository.getUserWebhooksPaginated(userId, skip, take);
  }
}
