import type { Prisma } from "@calcom/prisma/client";
import { TestingModule } from "@nestjs/testing";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

export class AttributeRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async create(data: Prisma.AttributeCreateInput) {
    return this.prismaWriteClient.attribute.create({ data });
  }

  async createOption(data: Prisma.AttributeOptionCreateInput) {
    return this.prismaWriteClient.attributeOption.create({ data });
  }

  async delete(id: string) {
    return this.prismaWriteClient.attribute.delete({ where: { id } });
  }

  async deleteOption(id: string) {
    return this.prismaWriteClient.attributeOption.delete({ where: { id } });
  }
}
