import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import { GOOGLE_MEET_TYPE } from "@calcom/platform-constants";

@Injectable()
export class ConferencingRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async findConferencingApps(userId: number) {
    return this.dbRead.prisma.credential.findMany({
      where: {
        userId,
        type: { endsWith: "_video" },
      },
    });
  }

  async findGoogleMeet(userId: number) {
    return this.dbRead.prisma.credential.findFirst({
      where: { userId, type: GOOGLE_MEET_TYPE },
    });
  }

  async findConferencingApp(userId: number, app: string) {
    return this.dbRead.prisma.credential.findFirst({
      where: { userId, appId: app },
    });
  }
}
