import { Injectable } from "@nestjs/common";
import { App } from "@prisma/client";
import { PrismaReadService } from "app/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "app/modules/prisma/prisma-write.service";

@Injectable()
export class AppsRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async getAppBySlug(slug: string): Promise<App | null> {
    return await this.dbRead.prisma.app.findUnique({ where: { slug } });
  }
}
