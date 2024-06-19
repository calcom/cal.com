import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";

import { truncateOnWord } from "@calcom/lib/text";

@Injectable()
export class OrganizationUsersRepository {
  constructor(private readonly dbRead: PrismaReadService) {}

  async getOrganizationUsers(organizationId: number, emailArray?: string[]) {
    const usersQuery = await this.dbRead.prisma.user.findMany({
      where: {
        teams: {
          some: {
            teamId: organizationId,
          },
        },
        ...(emailArray && { email: { in: emailArray } }),
      },
      select: {
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
      },
    });

    // Output expects avatarURL -> avatar
    return usersQuery.map((user) => {
      return { ...user, avatar: user.avatarUrl };
    });
  }
}
