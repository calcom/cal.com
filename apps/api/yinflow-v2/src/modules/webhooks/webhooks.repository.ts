import { Injectable } from "@nestjs/common";

import { Webhook } from "@calcom/prisma/client";

type WebhookInputData = Pick<
  Webhook,
  "payloadTemplate" | "eventTriggers" | "subscriberUrl" | "secret" | "active"
>;

@Injectable()
export class WebhooksRepository {
  // TODO: PrismaWriteService
  async createUserWebhook(userId: number, data: WebhookInputData) {
    // const id = uuidv4();
    // return this.dbWrite.prisma.webhook.create({
    //   data: { ...data, id, userId },
    // });
  }
  // TODO: PrismaWriteService
  async createEventTypeWebhook(eventTypeId: number, data: WebhookInputData) {
    // const id = uuidv4();
    // return this.dbWrite.prisma.webhook.create({
    //   data: { ...data, id, eventTypeId },
    // });
  }
  // TODO: PrismaWriteService
  async createOAuthClientWebhook(platformOAuthClientId: string, data: WebhookInputData) {
    // const id = uuidv4();
    // return this.dbWrite.prisma.webhook.create({
    //   data: { ...data, id, platformOAuthClientId },
    // });
  }
  // TODO: PrismaWriteService
  async updateWebhook(webhookId: string, data: Partial<WebhookInputData>) {
    // return this.dbWrite.prisma.webhook.update({
    //   where: { id: webhookId },
    //   data,
    // });
  }
  // TODO: PrismaReadService
  async getWebhookById(webhookId: string) {
    // return this.dbRead.prisma.webhook.findFirst({
    //   where: { id: webhookId },
    // });
  }
  // TODO: PrismaReadService
  async getUserWebhooksPaginated(userId: number, skip: number, take: number) {
    // return this.dbRead.prisma.webhook.findMany({
    //   where: { userId },
    //   skip,
    //   take,
    // });
  }
  // TODO: PrismaReadService
  async getEventTypeWebhooksPaginated(eventTypeId: number, skip: number, take: number) {
    // return this.dbRead.prisma.webhook.findMany({
    //   where: { eventTypeId },
    //   skip,
    //   take,
    // });
  }
  // TODO: PrismaReadService
  async getOAuthClientWebhooksPaginated(platformOAuthClientId: string, skip: number, take: number) {
    // return this.dbRead.prisma.webhook.findMany({
    //   where: { platformOAuthClientId },
    //   skip,
    //   take,
    // });
  }
  // TODO: PrismaReadService
  async getUserWebhookByUrl(userId: number, subscriberUrl: string) {
    // return this.dbRead.prisma.webhook.findFirst({
    //   where: { userId, subscriberUrl },
    // });
  }
  // TODO: PrismaReadService
  async getOAuthClientWebhookByUrl(platformOAuthClientId: string, subscriberUrl: string) {
    // return this.dbRead.prisma.webhook.findFirst({
    //   where: { platformOAuthClientId, subscriberUrl },
    // });
  }
  // TODO: PrismaReadService
  async getEventTypeWebhookByUrl(eventTypeId: number, subscriberUrl: string) {
    // return this.dbRead.prisma.webhook.findFirst({
    //   where: { eventTypeId, subscriberUrl },
    // });
  }
  // TODO: PrismaWriteService
  async deleteWebhook(webhookId: string) {
    // return this.dbWrite.prisma.webhook.delete({
    //   where: { id: webhookId },
    // });
  }
  // TODO: PrismaWriteService
  async deleteAllEventTypeWebhooks(eventTypeId: number) {
    // return this.dbWrite.prisma.webhook.deleteMany({
    //   where: { eventTypeId },
    // });
  }
  // TODO: PrismaWriteService
  async deleteAllOAuthClientWebhooks(oAuthClientId: string) {
    // return this.dbWrite.prisma.webhook.deleteMany({
    //   where: { platformOAuthClientId: oAuthClientId },
    // });
  }
}
