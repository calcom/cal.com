import { sanitizeUsername } from "@/lib/sanitizeUsername";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";

import type { Prisma } from "@calcom/prisma/client";

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
        username: sanitizeUsername(userOrgUsername),
      },
    });
  }

  async updateProfile(orgId: number, userId: number, body: Prisma.ProfileUpdateInput) {
    if (body.username !== undefined && typeof body.username === "string") {
      body.username = sanitizeUsername(body.username);
    }

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
