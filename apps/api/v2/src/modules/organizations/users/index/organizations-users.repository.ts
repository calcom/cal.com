import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

@Injectable()
export class OrganizationsUsersRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  private filterOnOrgMembership(orgId: number) {
    return {
      profiles: {
        some: {
          organizationId: orgId,
        },
      },
    };
  }

  async getOrganizationUsersByEmails(orgId: number, emailArray?: string[], skip?: number, take?: number) {
    return await this.dbRead.prisma.user.findMany({
      where: {
        ...this.filterOnOrgMembership(orgId),
        ...(emailArray && emailArray.length ? { email: { in: emailArray } } : {}),
      },
      include: {
        profiles: {
          where: {
            organizationId: orgId,
          },
        },
      },
      skip,
      take,
    });
  }

  async getOrganizationUsersByIds(orgId: number, userIds: number[]) {
    return await this.dbRead.prisma.user.findMany({
      where: {
        profiles: {
          some: {
            organizationId: orgId,
            userId: { in: userIds },
          },
        },
      },
      include: {
        profiles: true,
      },
    });
  }

  async getOrganizationUserByEmail(orgId: number, email: string) {
    return await this.dbRead.prisma.user.findFirst({
      where: {
        email,
        ...this.filterOnOrgMembership(orgId),
      },
      include: {
        profiles: {
          where: {
            organizationId: orgId,
          },
        },
      },
    });
  }

  async updateOrganizationUser(orgId: number, userId: number, updateUserBody: Prisma.UserUpdateInput) {
    return await this.dbWrite.prisma.user.update({
      where: {
        id: userId,
        organizationId: orgId,
      },
      data: updateUserBody,
      include: {
        profiles: {
          where: {
            organizationId: orgId,
          },
        },
      },
    });
  }

  async deleteUser(orgId: number, userId: number) {
    return await this.dbWrite.prisma.user.delete({
      where: {
        id: userId,
        organizationId: orgId,
      },
      include: {
        profiles: {
          where: {
            organizationId: orgId,
          },
        },
      },
    });
  }

  async getOrganizationUserByUsername(orgId: number, username: string) {
    const profile = await this.dbRead.prisma.profile.findUnique({
      where: {
        username_organizationId: {
          organizationId: orgId,
          username,
        },
      },
      include: {
        user: true,
      },
    });
    return profile?.user;
  }
}
