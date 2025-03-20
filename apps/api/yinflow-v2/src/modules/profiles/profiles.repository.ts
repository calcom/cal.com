import { Injectable } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";

import { PrismaReadService } from "../prisma/prisma-read.service";

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
}
