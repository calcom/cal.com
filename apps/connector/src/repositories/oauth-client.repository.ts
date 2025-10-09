import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import type { PrismaClient } from "@calcom/prisma";
import type { PlatformOAuthClient } from "@prisma/client";

@Injectable()
export class OAuthClientRepository extends BaseRepository<PlatformOAuthClient> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async getByUserId(userId: number) {
    return this.prisma.platformOAuthClient.findFirst({
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
    return this.prisma.platformOAuthClient.findFirst({
      where: {
        teams: {
          some: {
            id: teamId,
          },
        },
      },
    });
  }

  async getByEventTypeHosts(eventTypeId: number) {
    const hostWithUserPlatformClient = await this.prisma.host.findFirst({
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
