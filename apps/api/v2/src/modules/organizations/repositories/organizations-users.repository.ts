import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

// import { UpdateOrganizationUserInput_2024_06_18 } from "@calcom/platform-types";

const userSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  emailVerified: true,
  bio: true,
  avatarUrl: true,
  timeZone: true,
  weekStart: true,
  appTheme: true,
  theme: true,
  defaultScheduleId: true,
  locale: true,
  timeFormat: true,
  hideBranding: true,
  brandColor: true,
  darkBrandColor: true,
  allowDynamicBooking: true,
  createdDate: true,
  verified: true,
  invitedTo: true,
  role: true,
};

@Injectable()
export class OrganizationsUsersRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async getOrganizationUsers(orgId: number, emailArray?: string[]) {
    const usersQuery = await this.dbRead.prisma.user.findMany({
      where: {
        teams: {
          some: {
            teamId: orgId,
          },
        },
        ...(emailArray && emailArray.length && { email: { in: emailArray } }),
      },
      select: userSelect,
    });

    // Output expects avatarURL -> avatar
    return usersQuery.map((user) => {
      return { ...user, avatar: user.avatarUrl };
    });
  }

  async getOrganizationUserByUsername(orgId: number, username: string) {
    const userQuery = await this.dbRead.prisma.user.findFirst({
      where: {
        username,
        orgId,
      },
    });

    return userQuery;
  }

  async createOrganizationUser(orgId, createUserBody) {
    if (createUserBody.avatar) {
      createUserBody.avatarUrl = createUserBody.avatar;
      delete createUserBody.avatar;
    }

    const createdUser = await this.dbWrite.prisma.user.create({
      data: createUserBody,
      select: userSelect,
    });

    return { ...createdUser, avatar: createdUser.avatarUrl };
  }

  async updateUser(orgId, userId, updateUserBody) {
    if (createUserBody.avatar) {
      createUserBody.avatarUrl = createUserBody.avatar;
      delete createUserBody.avatar;
    }

    const updatedUser = await this.dbWrite.prisma.user.update({
      where: {
        id: userId,
        organizationId: orgId,
      },
      data: updateUserBody,
    });

    return { ...updatedUser, avatar: updatedUser.avatarUrl };
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
