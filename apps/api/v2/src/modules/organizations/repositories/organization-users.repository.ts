import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationUsersRepository {
  constructor(private readonly dbRead: PrismaReadService) {}

  async getOrganizationUsers(organizationId: number, emailArray: string[]) {
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
        name: true,
        email: true,
        timeZone: true,
      },
    });

    // Flatten the query
    return usersQuery;
  }
}
