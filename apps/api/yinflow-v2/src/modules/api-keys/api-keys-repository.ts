import { Injectable } from "@nestjs/common";

import { PrismaReadService } from "../prisma/prisma-read.service";
import { PrismaWriteService } from "../prisma/prisma-write.service";

@Injectable()
export class ApiKeysRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async getApiKeyFromHash(hashedKey: string) {
    return this.dbRead.prisma.apiKey.findUnique({
      where: {
        hashedKey,
      },
    });
  }

  async getTeamApiKeys(teamId: number) {
    return this.dbRead.prisma.apiKey.findMany({
      where: {
        teamId,
      },
    });
  }

  async deleteById(id: string) {
    return this.dbWrite.prisma.apiKey.delete({
      where: {
        id,
      },
    });
  }
}
