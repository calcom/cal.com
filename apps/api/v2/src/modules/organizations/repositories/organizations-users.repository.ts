import { CreateOrganizationUserInput } from "@/modules/organizations/inputs/create-organization-user.input";
import { UpdateOrganizationUserInput } from "@/modules/organizations/inputs/update-organization-user.input";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

// import { UpdateOrganizationUserInput_2024_06_18 } from "@calcom/platform-types";

@Injectable()
export class OrganizationsUsersRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  private filterOnOrgMembership(orgId: number) {
    return {
      OR: [
        { organizationId: orgId },
        {
          teams: {
            some: {
              teamId: orgId,
            },
          },
        },
      ],
    };
  }

  async getOrganizationUsers(orgId: number, emailArray?: string[]) {
    return await this.dbRead.prisma.user.findMany({
      where: {
        ...this.filterOnOrgMembership(orgId),
        ...(emailArray && emailArray.length && { email: { in: emailArray } }),
      },
    });
  }

  async getOrganizationUserByUsername(orgId: number, username: string) {
    return await this.dbRead.prisma.user.findFirst({
      where: {
        username,
        ...this.filterOnOrgMembership(orgId),
      },
    });
  }

  async createOrganizationUser(orgId: number, createUserBody: CreateOrganizationUserInput) {
    const createdUser = await this.dbWrite.prisma.user.create({
      data: createUserBody,
    });

    return createdUser;
  }

  async updateUser(orgId: number, userId: number, updateUserBody: UpdateOrganizationUserInput) {
    return await this.dbWrite.prisma.user.update({
      where: {
        id: userId,
        organizationId: orgId,
      },
      data: updateUserBody,
    });
  }

  //   async updateOrganizationUser(
  //     orgId: number,
  //     userId: number,
  //     updateData: UpdateOrganizationUserInput_2024_06_18
  //   ) {
  //     const updateUser = await this.dbRead.prisma.user.update({
  //       where: {
  //         id: userId,
  //         teams: {
  //           some: {
  //             teamId: orgId,
  //           },
  //         },
  //       },
  //       data: updateData,
  //     });

  //     return { ...updateUser, avatar: updateUser.avatarUrl };
  //   }
}
