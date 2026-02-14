import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";

import type { Webhook } from "@calcom/prisma/client";

type WebhookInputData = Pick<
  Webhook,
  "payloadTemplate" | "eventTriggers" | "subscriberUrl" | "secret" | "active"
>;
@Injectable()
export class OrganizationsWebhooksRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService
  ) {}

  async findWebhookByUrl(organizationId: number, subscriberUrl: string) {
    return this.dbRead.prisma.webhook.findFirst({
      where: { teamId: organizationId, subscriberUrl },
    });
  }

  async findWebhook(organizationId: number, webhookId: string) {
    return this.dbRead.prisma.webhook.findUnique({
      where: {
        id: webhookId,
        teamId: organizationId,
      },
    });
  }

  async findWebhooks(organizationId: number) {
    return this.dbRead.prisma.webhook.findMany({
      where: {
        teamId: organizationId,
      },
    });
  }

  async deleteWebhook(organizationId: number, webhookId: string) {
    return this.dbRead.prisma.webhook.delete({
      where: {
        id: webhookId,
        teamId: organizationId,
      },
    });
  }

  async createWebhook(organizationId: number, data: WebhookInputData) {
    const id = uuidv4();
    return this.dbWrite.prisma.webhook.create({
      data: { ...data, id, teamId: organizationId },
    });
  }

  async updateWebhook(organizationId: number, webhookId: string, data: Partial<WebhookInputData>) {
    return this.dbRead.prisma.webhook.update({
      data: { ...data },
      where: { id: webhookId, teamId: organizationId },
    });
  }

  async findWebhooksPaginated(organizationId: number, skip: number, take: number) {
    return this.dbRead.prisma.webhook.findMany({
      where: {
        teamId: organizationId,
      },
      skip,
      take,
    });
  }
}
