import type { Prisma } from "@calcom/prisma/client";
import { Injectable } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";

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

  async updateProfile(orgId: number, userId: number, body: Prisma.ProfileUpdateInput) {
    return this.dbRead.prisma.profile.update({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId,
        },
      },
      data: body,
    });
  }
}
