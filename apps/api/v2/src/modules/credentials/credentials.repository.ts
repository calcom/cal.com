import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

@Injectable()
export class CredentialsRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  createAppCredential(type: string, key: Prisma.InputJsonValue, userId: number, appId: string) {
    return this.dbWrite.prisma.credential.create({
      data: {
        type,
        key,
        userId,
        appId,
      },
    });
  }
  getByTypeAndUserId(type: string, userId: number) {
    return this.dbWrite.prisma.credential.findFirst({ where: { type, userId } });
  }
}
