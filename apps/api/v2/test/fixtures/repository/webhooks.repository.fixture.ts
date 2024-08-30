import { TestingModule } from "@nestjs/testing";
import { Prisma } from "@prisma/client";
import { PrismaReadService } from "app/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "app/modules/prisma/prisma-write.service";

export class WebhookRepositoryFixture {
  private primaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.primaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async create(data: Prisma.WebhookCreateInput) {
    return this.prismaWriteClient.webhook.create({ data });
  }

  async delete(webhookId: string) {
    return this.prismaWriteClient.webhook.delete({ where: { id: webhookId } });
  }
}
