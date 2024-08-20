import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import {
  CreateWebhookInputDto as CreateOrgWebhookDto,
  UpdateWebhookInputDto as UpdateOrgWebhookDto,
} from "@/modules/webhooks/inputs/webhook.input";
import { Injectable } from "@nestjs/common";
import { v4 } from "uuid";

@Injectable()
export class OrganizationsWebhooksRepository {
  constructor(private readonly dbRead: PrismaReadService) {}

  async findOrgWebhook(organizationId: number, webhookId: string) {
    return this.dbRead.prisma.webhook.findUnique({
      where: {
        id: webhookId,
        teamId: organizationId,
      },
    });
  }

  async findOrgWebhooks(organizationId: number) {
    return this.dbRead.prisma.webhook.findMany({
      where: {
        teamId: organizationId,
      },
    });
  }

  async deleteOrgWebhook(organizationId: number, webhookId: string) {
    return this.dbRead.prisma.webhook.delete({
      where: {
        id: webhookId,
        teamId: organizationId,
      },
    });
  }

  async createOrgWebhook(organizationId: number, data: CreateOrgWebhookDto) {
    return this.dbRead.prisma.webhook.create({
      data: { ...data, teamId: organizationId, id: v4() },
    });
  }

  async updateOrgWebhook(organizationId: number, webhookId: string, data: UpdateOrgWebhookDto) {
    return this.dbRead.prisma.webhook.update({
      data: { ...data },
      where: { id: webhookId, teamId: organizationId },
    });
  }

  async findOrgWebhooksPaginated(organizationId: number, skip: number, take: number) {
    return this.dbRead.prisma.webhook.findMany({
      where: {
        teamId: organizationId,
      },
      skip,
      take,
    });
  }
}
