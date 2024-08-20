import { OrganizationsWebhooksRepository } from "@/modules/organizations/repositories/organizations-webhooks.repository";
import {
  CreateWebhookInputDto as CreateOrgWebhookDto,
  UpdateWebhookInputDto as UpdateOrgWebhookDto,
} from "@/modules/webhooks/inputs/webhook.input";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationsWebhooksService {
  constructor(private readonly organizationsWebhooksRepository: OrganizationsWebhooksRepository) {}

  async getPaginatedOrgWebhooks(organizationId: number, skip = 0, take = 250) {
    const webhooks = await this.organizationsWebhooksRepository.findOrgWebhooksPaginated(
      organizationId,
      skip,
      take
    );
    return webhooks;
  }

  async getOrgWebhook(organizationId: number, webhookId: string) {
    const webhook = await this.organizationsWebhooksRepository.findOrgWebhook(organizationId, webhookId);
    return webhook;
  }

  async deleteOrgWebhook(organizationId: number, webhookId: string) {
    const webhook = await this.organizationsWebhooksRepository.deleteOrgWebhook(organizationId, webhookId);
    return webhook;
  }

  async updateOrgWebhook(organizationId: number, webhookId: string, data: UpdateOrgWebhookDto) {
    const team = await this.organizationsWebhooksRepository.updateOrgWebhook(organizationId, webhookId, data);
    return team;
  }

  async createOrgWebhook(organizationId: number, data: CreateOrgWebhookDto) {
    const webhook = await this.organizationsWebhooksRepository.createOrgWebhook(organizationId, data);
    return webhook;
  }
}
