import { OrganizationsWebhooksRepository } from "@/modules/organizations/repositories/organizations-webhooks.repository";
import { UpdateWebhookInputDto } from "@/modules/webhooks/inputs/webhook.input";
import { PipedInputWebhookType } from "@/modules/webhooks/pipes/WebhookInputPipe";
import { WebhooksRepository } from "@/modules/webhooks/webhooks.repository";
import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";

@Injectable()
export class OrganizationsWebhooksService {
  private readonly logger = new Logger("OrganizationsWebhooksService");

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

    const webhook = await this.organizationsWebhooksRepository.createWebhook(orgId, {
      ...body,
      payloadTemplate: body.payloadTemplate ?? null,
      secret: body.secret ?? null,
    });

    this.logEvent('create', orgId, webhook.id);
    return webhook;
  }

  async getWebhooksPaginated(orgId: number, skip: number, take: number) {
    return this.organizationsWebhooksRepository.findWebhooksPaginated(orgId, skip, take);
  }

  async getWebhook(webhookId: string) {
    const webhook = await this.webhooksRepository.getWebhookById(webhookId);
    if (!webhook) {
      throw new NotFoundException(`Webhook (${webhookId}) not found`);
    }
    return webhook;
  }

  async updateWebhook(webhookId: string, body: UpdateWebhookInputDto) {
    const webhook = await this.webhooksRepository.updateWebhook(webhookId, body);
    this.logEvent('update', webhook.teamId, webhook.id);
    return webhook;
  }

  async deleteWebhook(orgId: number, webhookId: string) {
    const webhook = await this.organizationsWebhooksRepository.deleteWebhook(orgId, webhookId);
    this.logEvent('delete', orgId, webhookId);
    return webhook;
  }

  private logEvent(action: string, orgId: number, webhookId: string | null) {
    const webhookIdText = webhookId ? `webhook ${webhookId}` : 'all webhooks';
    this.logger.log(`Performed ${action} action on ${webhookIdText} for organization ${orgId}`);
  }
}
