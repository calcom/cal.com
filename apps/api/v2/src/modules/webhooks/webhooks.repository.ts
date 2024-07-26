import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";

import { PrismaWriteService } from "../prisma/prisma-write.service";
import { CreateUserWebhookInputDto } from "./inputs/create-user-webhook.input";

@Injectable()
export class WebhooksRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async createUserWebhook(userId: number, data: CreateUserWebhookInputDto) {
    const id = uuidv4();
    return this.dbWrite.prisma.webhook.create({
      data: { ...data, id, userId },
    });
  }

  async updateWebhook(webhookId: string, data: Partial<CreateUserWebhookInputDto>) {
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

  async deleteWebhook(webhookId: string) {
    return this.dbWrite.prisma.webhook.delete({
      where: { id: webhookId },
    });
  }
}
