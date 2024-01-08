import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { APPS_TYPE_ID_MAPPING } from "@calcom/platform-constants";

@Injectable()
export class CredentialsRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  createAppCredential(type: keyof typeof APPS_TYPE_ID_MAPPING, key: Prisma.InputJsonValue, userId: number) {
    return this.dbWrite.prisma.credential.create({
      data: {
        type,
        key,
        userId,
        appId: APPS_TYPE_ID_MAPPING[type],
      },
    });
  }
  getByTypeAndUserId(type: string, userId: number) {
    return this.dbWrite.prisma.credential.findFirst({ where: { type, userId } });
  }
}
