import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
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
  constructor(private readonly dbRead: PrismaReadService) {}

  async getOrganizationUsers(organizationId: number, emailArray?: string[]) {
    const usersQuery = await this.dbRead.prisma.user.findMany({
      where: {
        teams: {
          some: {
            teamId: organizationId,
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

  //   async updateOrganizationUser(
  //     organizationId: number,
  //     userId: number,
  //     updateData: UpdateOrganizationUserInput_2024_06_18
  //   ) {
  //     const updateUser = await this.dbRead.prisma.user.update({
  //       where: {
  //         id: userId,
  //         teams: {
  //           some: {
  //             teamId: organizationId,
  //           },
  //         },
  //       },
  //       data: updateData,
  //     });

  //     return { ...updateUser, avatar: updateUser.avatarUrl };
  //   }
}
