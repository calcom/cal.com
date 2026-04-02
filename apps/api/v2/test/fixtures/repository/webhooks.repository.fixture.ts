import type { Prisma } from "@calcom/prisma/client";
import { TestingModule } from "@nestjs/testing";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

export class WebhookRepositoryFixture {
  private primaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(module: TestingModule) {
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
