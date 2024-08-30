import { ConflictException, Injectable } from "@nestjs/common";
import { PipedInputWebhookType } from "src/modules/webhooks/pipes/WebhookInputPipe";
import { WebhooksRepository } from "src/modules/webhooks/webhooks.repository";

@Injectable()
export class OAuthClientWebhooksService {
  constructor(private readonly webhooksRepository: WebhooksRepository) {}

  async createOAuthClientWebhook(platformOAuthClientId: string, body: PipedInputWebhookType) {
    const existingWebhook = await this.webhooksRepository.getOAuthClientWebhookByUrl(
      platformOAuthClientId,
      body.subscriberUrl
    );
    if (existingWebhook) {
      throw new ConflictException("Webhook with this subscriber url already exists for this oAuth client");
    }

    return this.webhooksRepository.createOAuthClientWebhook(platformOAuthClientId, {
      ...body,
      payloadTemplate: body.payloadTemplate ?? null,
      secret: body.secret ?? null,
    });
  }

  async getOAuthClientWebhooksPaginated(platformOAuthClientId: string, skip: number, take: number) {
    return this.webhooksRepository.getOAuthClientWebhooksPaginated(platformOAuthClientId, skip, take);
  }

  async deleteAllOAuthClientWebhooks(platformOAuthClientId: string): Promise<{ count: number }> {
    return this.webhooksRepository.deleteAllOAuthClientWebhooks(platformOAuthClientId);
  }
}
