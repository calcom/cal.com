import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";

import type { Webhook } from "@calcom/prisma/client";

import { PrismaWriteService } from "../prisma/prisma-write.service";

type WebhookInputData = Pick<
  Webhook,
  "payloadTemplate" | "eventTriggers" | "subscriberUrl" | "secret" | "active"
>;

@Injectable()
export class WebhooksRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async createUserWebhook(userId: number, data: WebhookInputData) {
    const id = uuidv4();
    return this.dbWrite.prisma.webhook.create({
      data: { ...data, id, userId },
    });
  }

  async createEventTypeWebhook(eventTypeId: number, data: WebhookInputData) {
    const id = uuidv4();
    return this.dbWrite.prisma.webhook.create({
      data: { ...data, id, eventTypeId },
    });
  }

  async createOAuthClientWebhook(platformOAuthClientId: string, data: WebhookInputData) {
    const id = uuidv4();
    return this.dbWrite.prisma.webhook.create({
      data: { ...data, id, platformOAuthClientId },
    });
  }

  async updateWebhook(webhookId: string, data: Partial<WebhookInputData>) {
    return this.dbWrite.prisma.webhook.update({
      where: { id: webhookId },
      data,
    });
  }

  async getWebhookById(webhookId: string) {
    return this.dbRead.prisma.webhook.findFirst({
      where: { id: webhookId },
    });
  }

  async getUserWebhooksPaginated(userId: number, skip: number, take: number) {
    return this.dbRead.prisma.webhook.findMany({
      where: { userId },
      skip,
      take,
    });
  }

  async getEventTypeWebhooksPaginated(eventTypeId: number, skip: number, take: number) {
    return this.dbRead.prisma.webhook.findMany({
      where: { eventTypeId },
      skip,
      take,
    });
  }

  async getOAuthClientWebhooksPaginated(platformOAuthClientId: string, skip: number, take: number) {
    return this.dbRead.prisma.webhook.findMany({
      where: { platformOAuthClientId },
      skip,
      take,
    });
  }

  async getUserWebhookByUrl(userId: number, subscriberUrl: string) {
    return this.dbRead.prisma.webhook.findFirst({
      where: { userId, subscriberUrl },
    });
  }

  async getOAuthClientWebhookByUrl(platformOAuthClientId: string, subscriberUrl: string) {
    return this.dbRead.prisma.webhook.findFirst({
      where: { platformOAuthClientId, subscriberUrl },
    });
  }

  async getEventTypeWebhookByUrl(eventTypeId: number, subscriberUrl: string) {
    return this.dbRead.prisma.webhook.findFirst({
      where: { eventTypeId, subscriberUrl },
    });
  }

  async deleteWebhook(webhookId: string) {
    return this.dbWrite.prisma.webhook.delete({
      where: { id: webhookId },
    });
  }

  async deleteAllEventTypeWebhooks(eventTypeId: number) {
    return this.dbWrite.prisma.webhook.deleteMany({
      where: { eventTypeId },
    });
  }

  async deleteAllOAuthClientWebhooks(oAuthClientId: string) {
    return this.dbWrite.prisma.webhook.deleteMany({
      where: { platformOAuthClientId: oAuthClientId },
    });
  }
}
