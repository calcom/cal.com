import { Injectable } from "@nestjs/common";
import { App } from "@prisma/client";

@Injectable()
export class AppsRepository {
  // TODO: PrismaReadService
  async getAppBySlug(slug: string): Promise<App | null> {
    // return await this.dbRead.prisma.app.findUnique({ where: { slug } });

    // tira essa linha
    return null;
  }
}
