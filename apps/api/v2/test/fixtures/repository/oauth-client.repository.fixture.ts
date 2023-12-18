import { CreateOAuthClientInput } from "@/modules/oauth/input/create-oauth-client";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";
import { PlatformOAuthClient } from "@prisma/client";

export class OAuthClientRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async get(clientId: PlatformOAuthClient["id"]) {
    return this.prismaReadClient.platformOAuthClient.findFirst({ where: { id: clientId } });
  }

  async create(organizationId: number, data: CreateOAuthClientInput, secret: string) {
    return this.prismaWriteClient.platformOAuthClient.create({
      data: {
        ...data,
        secret,
        organizationId,
      },
    });
  }

  async delete(clientId: PlatformOAuthClient["id"]) {
    return this.prismaWriteClient.platformOAuthClient.delete({ where: { id: clientId } });
  }

  async deleteByClientId(clientId: PlatformOAuthClient["id"]) {
    return this.prismaWriteClient.platformOAuthClient.delete({ where: { id: clientId } });
  }
}
