import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

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
