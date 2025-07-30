import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class ProfilesRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService
  ) {}

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

  async createProfile(orgId: number, userId: number, userOrgUsername: string) {
    await this.dbRead.prisma.profile.create({
      data: {
        uid: uuidv4(),
        organizationId: orgId,
        userId,
        username: userOrgUsername,
      },
    });
  }

  async deleteProfile(userId: number, organizationId: number) {
    return await this.dbWrite.prisma.profile.delete({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });
  }
}
