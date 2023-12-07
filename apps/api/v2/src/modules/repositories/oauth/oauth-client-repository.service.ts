import type { CreateOAuthClientInput } from "@/modules/oauth/input/create-oauth-client";
import type { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import type { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import type { PlatformOAuthClient } from "@prisma/client";

@Injectable()
export class OAuthClientRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService,
    private jwtService: JwtService
  ) {}

  async createOAuthClient(userId: number, data: CreateOAuthClientInput) {
    return this.dbWrite.prisma.platformOAuthClient.create({
      data: {
        ...data,
        secret: await this.jwtService.signAsync(data),
        users: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }

  async getOAuthClient(clientId: string): Promise<PlatformOAuthClient> {
    return this.dbRead.prisma.platformOAuthClient.findUniqueOrThrow({
      where: { id: clientId },
    });
  }

  async getUserOAuthClients(userId: number): Promise<PlatformOAuthClient[]> {
    return this.dbRead.prisma.platformOAuthClient.findMany({
      where: {
        users: {
          some: { id: userId },
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
