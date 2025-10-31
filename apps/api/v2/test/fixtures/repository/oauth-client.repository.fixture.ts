import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";

import type { PlatformOAuthClient, Prisma } from "@calcom/prisma/client";

export class OAuthClientRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async get(clientId: PlatformOAuthClient["id"]) {
    return this.prismaReadClient.platformOAuthClient.findFirst({ where: { id: clientId } });
  }

  async getByOrgId(orgId: PlatformOAuthClient["organizationId"]) {
    return this.prismaReadClient.platformOAuthClient.findMany({ where: { organizationId: orgId } });
  }

  async getUsers(clientId: PlatformOAuthClient["id"]) {
    const response = await this.prismaReadClient.platformOAuthClient.findFirst({
      where: { id: clientId },
      include: {
        users: true,
      },
    });

    return response?.users;
  }

  async create(
    organizationId: number,
    data: Omit<Prisma.PlatformOAuthClientCreateInput, "organization" | "secret">,
    secret: string
  ) {
    return this.prismaWriteClient.platformOAuthClient.create({
      data: {
        ...data,
        secret,
        organizationId,
      },
    });
  }

  async update(clientId: PlatformOAuthClient["id"], data: Prisma.PlatformOAuthClientUpdateInput) {
    return this.prismaWriteClient.platformOAuthClient.update({
      where: { id: clientId },
      data,
    });
  }

  async delete(clientId: PlatformOAuthClient["id"]) {
    return this.prismaWriteClient.platformOAuthClient.delete({ where: { id: clientId } });
  }

  async deleteByClientId(clientId: PlatformOAuthClient["id"]) {
    return this.prismaWriteClient.platformOAuthClient.delete({ where: { id: clientId } });
  }
}
