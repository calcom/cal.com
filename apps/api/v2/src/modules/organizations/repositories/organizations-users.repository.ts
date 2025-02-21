import { CreateOrganizationUserInput } from "@/modules/organizations/inputs/create-organization-user.input";
import { UpdateOrganizationUserInput } from "@/modules/organizations/inputs/update-organization-user.input";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import { CreationSource } from "@prisma/client";

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

  async createOrganizationUser(orgId: number, createUserBody: CreateOrganizationUserInput) {
    const createdUser = await this.dbWrite.prisma.user.create({
      data: { ...createUserBody, creationSource: CreationSource.API_V2 },
    });

    return createdUser;
  }

  async updateOrganizationUser(orgId: number, userId: number, updateUserBody: UpdateOrganizationUserInput) {
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
