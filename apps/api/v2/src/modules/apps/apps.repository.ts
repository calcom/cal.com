import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import { App, Prisma } from "@prisma/client";

@Injectable()
export class AppsRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

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
}
