import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationUsersRepository {
  constructor(private readonly dbRead: PrismaReadService) {}

  async getOrganizationUsers(organizationId: number) {
    const usersQuery = await this.dbRead.prisma.membership.findMany({
      where: {
        teamId: organizationId,
        team: {
          isOrganization: true,
        },
      },
      select: {
        role: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            timeZone: true,
          },
        },
      },
    });

    // Flatten the query
    return usersQuery.map((member) => {
      return {
        role: member.role,
        ...member.user,
      };
    });
  }
}
