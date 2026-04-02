import type { App, Prisma } from "@calcom/prisma/client";
import { Injectable } from "@nestjs/common";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

@Injectable()
export class AppsRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService
  ) {}

  async getAppBySlug(slug: string): Promise<App | null> {
    return await this.dbRead.prisma.app.findUnique({ where: { slug } });
  }

  async createAppCredential(type: string, key: Prisma.InputJsonValue, userId: number, appId: string) {
    return this.dbWrite.prisma.credential.create({
      data: {
        type: type,
        key: key,
        userId: userId,
        appId: appId,
      },
    });
  }

  async deleteAppCredentials(credentialIdsToDelete: number[], userId: number) {
    return this.dbWrite.prisma.credential.deleteMany({
      where: {
        id: { in: credentialIdsToDelete },
        userId,
      },
    });
  }

  async deleteTeamAppCredentials(credentialIdsToDelete: number[], teamId: number) {
    return this.dbWrite.prisma.credential.deleteMany({
      where: {
        id: { in: credentialIdsToDelete },
        teamId,
      },
    });
  }

  async createTeamAppCredential(type: string, key: Prisma.InputJsonValue, teamId: number, appId: string) {
    return this.dbWrite.prisma.credential.create({
      data: {
        type: type,
        key: key,
        teamId: teamId,
        appId: appId,
      },
    });
  }

  async findAppCredential({
    type,
    appId,
    userId,
    teamId,
  }: {
    type: string;
    appId: string;
    userId?: number;
    teamId?: number;
  }) {
    return this.dbWrite.prisma.credential.findMany({
      select: {
        id: true,
      },
      where: {
        type,
        userId,
        teamId,
        appId,
      },
    });
  }
}
