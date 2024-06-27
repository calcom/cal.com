import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

// import { UpdateOrganizationUserInput_2024_06_18 } from "@calcom/platform-types";

@Injectable()
export class OrganizationsUsersRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async getOrganizationUsers(orgId: number, emailArray?: string[]) {
    const users = await this.dbRead.prisma.user.findMany({
      where: {
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
        ...(emailArray && emailArray.length && { email: { in: emailArray } }),
      },
    });
    return users;
  }

  // async getOrganizationUserByUsername(orgId: number, username: string) {
  //   const userQuery = await this.dbRead.prisma.user.findFirst({
  //     where: {
  //       username,
  //       orgId,
  //     },
  //   });

  //   return userQuery;
  // }

  // async createOrganizationUser(orgId, createUserBody) {
  //   if (createUserBody.avatar) {
  //     createUserBody.avatarUrl = createUserBody.avatar;
  //     delete createUserBody.avatar;
  //   }

  //   const createdUser = await this.dbWrite.prisma.user.create({
  //     data: createUserBody,
  //     select: userSelect,
  //   });

  //   return { ...createdUser, avatar: createdUser.avatarUrl };
  // }

  // async updateUser(orgId, userId, updateUserBody) {
  //   if (createUserBody.avatar) {
  //     createUserBody.avatarUrl = createUserBody.avatar;
  //     delete createUserBody.avatar;
  //   }

  //   const updatedUser = await this.dbWrite.prisma.user.update({
  //     where: {
  //       id: userId,
  //       organizationId: orgId,
  //     },
  //     data: updateUserBody,
  //   });

  //   return { ...updatedUser, avatar: updatedUser.avatarUrl };
  // }

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
