import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OAuthAuthorizationRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService
  ) {}

  async upsertAuthorization(userId: number, oAuthClientId: string, scopes: string[]) {
    return this.dbWrite.prisma.oAuthAuthorization.upsert({
      where: { userId_oAuthClientId: { userId, oAuthClientId } },
      create: { userId, oAuthClientId, scopes },
      update: { scopes },
    });
  }

  async updateLastRefreshed(userId: number, oAuthClientId: string) {
    return this.dbWrite.prisma.oAuthAuthorization.update({
      where: { userId_oAuthClientId: { userId, oAuthClientId } },
      data: { lastRefreshedAt: new Date() },
    });
  }

  async getAuthorizationsByClient(oAuthClientId: string) {
    return this.dbRead.prisma.oAuthAuthorization.findMany({
      where: { oAuthClientId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
}