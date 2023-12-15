import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";
import { Prisma, PlatformOAuthClient } from "@prisma/client";

export class OAuthClientFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async get(clientId: PlatformOAuthClient["id"]) {
    return this.prismaReadClient.platformOAuthClient.findFirst({ where: { id: clientId } });
  }

  async create(data: Prisma.PlatformOAuthClientCreateInput) {
    return this.prismaWriteClient.platformOAuthClient.create({ data });
  }

  async delete(clientId: PlatformOAuthClient["id"]) {
    return this.prismaWriteClient.platformOAuthClient.delete({ where: { id: clientId } });
  }

  async deleteByClientId(clientId: PlatformOAuthClient["id"]) {
    return this.prismaWriteClient.platformOAuthClient.delete({ where: { id: clientId } });
  }
}
