import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import type { PlatformOAuthClient, Prisma } from "@calcom/prisma/client";

@Injectable()
export class OAuthClientRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async createOAuthClient(
    organizationId: number,
    data: Omit<Prisma.PlatformOAuthClientCreateInput, "organization">
  ) {
    return this.dbWrite.prisma.platformOAuthClient.create({
      data: {
        ...data,
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
    updateData: Prisma.PlatformOAuthClientUpdateInput
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

  async getByOrgId(organizationId: number) {
    return this.dbRead.prisma.platformOAuthClient.findMany({
      where: {
        organizationId,
      },
      select: { id: true },
    });
  }

  async getByEventTypeHosts(eventTypeId: number) {
    const hostWithUserPlatformClient = await this.dbRead.prisma.host.findFirst({
      select: {
        user: { select: { platformOAuthClients: true } },
      },
      where: {
        eventTypeId: eventTypeId,
        user: {
          isPlatformManaged: true,
        },
      },
    });
    return hostWithUserPlatformClient?.user?.platformOAuthClients?.[0] ?? null;
  }
}
