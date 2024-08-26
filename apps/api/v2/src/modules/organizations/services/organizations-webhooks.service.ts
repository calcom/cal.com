import { OrganizationsWebhooksRepository } from "@/modules/organizations/repositories/organizations-webhooks.repository";
import { UpdateWebhookInputDto } from "@/modules/webhooks/inputs/webhook.input";
import { PipedInputWebhookType } from "@/modules/webhooks/pipes/WebhookInputPipe";
import { WebhooksRepository } from "@/modules/webhooks/webhooks.repository";
import { ConflictException, Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationsWebhooksService {
  constructor(
    private readonly organizationsWebhooksRepository: OrganizationsWebhooksRepository,
    private readonly webhooksRepository: WebhooksRepository
  ) {}

  async createWebhook(orgId: number, body: PipedInputWebhookType) {
    const existingWebhook = await this.organizationsWebhooksRepository.findWebhookByUrl(
      orgId,
      body.subscriberUrl
    );
    if (existingWebhook) {
      throw new ConflictException("Webhook with this subscriber url already exists for this user");
    }

    return this.organizationsWebhooksRepository.createWebhook(orgId, {
      ...body,
      payloadTemplate: body.payloadTemplate ?? null,
      secret: body.secret ?? null,
    });
  }

  async getWebhooksPaginated(orgId: number, skip: number, take: number) {
    return this.organizationsWebhooksRepository.findWebhooksPaginated(orgId, skip, take);
  }

  async getWebhook(orgId: number, webhookId: string) {
    return this.organizationsWebhooksRepository.findWebhook(orgId, webhookId);
  }

  async updateWebhook(webhookId: string, body: UpdateWebhookInputDto) {
    return this.webhooksRepository.updateWebhook(webhookId, body);
  }
}
