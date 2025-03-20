import { ConflictException, Injectable } from "@nestjs/common";

import { PipedInputWebhookType } from "../../webhooks/pipes/WebhookInputPipe";
import { WebhooksRepository } from "../../webhooks/webhooks.repository";

@Injectable()
export class UserWebhooksService {
  constructor(private readonly webhooksRepository: WebhooksRepository) {}

  async createUserWebhook(userId: number, body: PipedInputWebhookType) {
    const existingWebhook = await this.webhooksRepository.getUserWebhookByUrl(userId, body.subscriberUrl);
    if (existingWebhook) {
      throw new ConflictException("Webhook with this subscriber url already exists for this user");
    }

    return this.webhooksRepository.createUserWebhook(userId, {
      ...body,
      payloadTemplate: body.payloadTemplate ?? null,
      secret: body.secret ?? null,
    });
  }

  async getUserWebhooksPaginated(userId: number, skip: number, take: number) {
    return this.webhooksRepository.getUserWebhooksPaginated(userId, skip, take);
  }
}
