import type { PrismaClient } from "@calcom/prisma";
import type { AccessScope } from "@calcom/prisma/enums";

export class OAuthAuthorizationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsert(clientId: string, userId: number, scopes: AccessScope[]) {
    await this.prisma.oAuthAuthorization.upsert({
      where: { userId_clientId: { userId, clientId } },
      create: { clientId, userId, scopes },
      update: { scopes },
    });
  }

  async updateLastRefreshedAt(clientId: string, userId: number) {
    await this.prisma.oAuthAuthorization.update({
      where: { userId_clientId: { userId, clientId } },
      data: { lastRefreshedAt: new Date() },
    });
  }

  async countByClientId(clientId: string) {
    return this.prisma.oAuthAuthorization.count({ where: { clientId } });
  }

  async findByClientIdIncludeUser(clientId: string, page: number, limit: number) {
    return this.prisma.oAuthAuthorization.findMany({
      where: { clientId },
      select: {
        scopes: true,
        createdAt: true,
        lastRefreshedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });
  }
}
