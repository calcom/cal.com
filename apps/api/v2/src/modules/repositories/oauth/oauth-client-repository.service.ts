import { CreateOAuthClientInput } from "@/modules/oauth/input/create-oauth-client";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { PlatformOAuthClient } from "@prisma/client";

@Injectable()
export class OAuthClientRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService,
    private jwtService: JwtService
  ) {}

  async createOAuthClient(organizationId: number, data: CreateOAuthClientInput) {
    return this.dbWrite.prisma.platformOAuthClient.create({
      data: {
        ...data,
        secret: await this.jwtService.signAsync(data),
        organizationId,
      },
    });
  }

  async getOAuthClient(clientId: string): Promise<PlatformOAuthClient> {
    return this.dbRead.prisma.platformOAuthClient.findUniqueOrThrow({
      where: { id: clientId },
    });
  }

  async getOrganizationOAuthClients(organizationId: number): Promise<PlatformOAuthClient[]> {
    return this.dbRead.prisma.platformOAuthClient.findMany({
      where: {
        organization: {
          id: organizationId,
        },
      },
    });
  }

  async updateOAuthClient(
    clientId: string,
    updateData: Partial<CreateOAuthClientInput>
  ): Promise<PlatformOAuthClient> {
    return this.dbWrite.prisma.platformOAuthClient.update({
      where: { id: clientId },
      data: updateData,
    });
  }

  async deleteOAuthClient(clientId: string): Promise<PlatformOAuthClient> {
    return this.dbWrite.prisma.platformOAuthClient.delete({
      where: { id: clientId },
    });
  }
}
