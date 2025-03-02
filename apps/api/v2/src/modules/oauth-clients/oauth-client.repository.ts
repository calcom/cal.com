import { JwtService } from "@/modules/jwt/jwt.service";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import type { PlatformOAuthClient } from "@prisma/client";

import type { CreateOAuthClientInput } from "@calcom/platform-types";

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
        secret: this.jwtService.sign(data),
        organizationId,
      },
    });
  }

  async getOAuthClient(clientId: string): Promise<PlatformOAuthClient | null> {
    return this.dbRead.prisma.platformOAuthClient.findUnique({
      where: { id: clientId },
    });
  }

  async getOAuthClientWithAuthTokens(tokenId: string, clientId: string, clientSecret: string) {
    return this.dbRead.prisma.platformOAuthClient.findUnique({
      where: {
        id: clientId,
        secret: clientSecret,
        authorizationTokens: {
          some: {
            id: tokenId,
          },
        },
      },
      include: {
        authorizationTokens: {
          where: {
            id: tokenId,
          },
          include: {
            owner: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });
  }

  async getOAuthClientWithRefreshSecret(clientId: string, clientSecret: string, refreshToken: string) {
    return this.dbRead.prisma.platformOAuthClient.findFirst({
      where: {
        id: clientId,
        secret: clientSecret,
      },
      include: {
        refreshToken: {
          where: {
            secret: refreshToken,
          },
        },
      },
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

  async getByUserId(userId: number) {
    return this.dbRead.prisma.platformOAuthClient.findFirst({
      where: {
        users: {
          some: {
            id: userId,
          },
        },
      },
    });
  }

  async getByTeamId(teamId: number) {
    return this.dbRead.prisma.platformOAuthClient.findFirst({
      where: {
        teams: {
          some: {
            id: teamId,
          },
        },
      },
    });
  }
}
