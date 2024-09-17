import { Injectable } from "@nestjs/common";

import { PrismaReadService } from "../prisma/prisma-read.service";
import { PrismaWriteService } from "../prisma/prisma-write.service";

@Injectable()
export class ApiKeyRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async getApiKeyFromHash(hashedKey: string) {
    return this.dbRead.prisma.apiKey.findUnique({
      where: {
        hashedKey,
      },
    });
  }
}
