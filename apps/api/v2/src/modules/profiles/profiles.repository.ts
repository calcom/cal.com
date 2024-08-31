import { Injectable } from "@nestjs/common";
import { PrismaReadService } from "src/modules/prisma/prisma-read.service";

@Injectable()
export class ProfilesRepository {
  constructor(private readonly dbRead: PrismaReadService) {}

  async getPlatformOwnerUserId(organizationId: number) {
    const profile = await this.dbRead.prisma.profile.findFirst({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return profile?.userId;
  }
}
