import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class TeamsUsersRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async getTeamUsersByEmails(teamId: number, emailArray?: string[], skip?: number, take?: number) {
    return await this.dbRead.prisma.user.findMany({
      where: {
        teams: {
          some: {
            teamId: teamId,
            accepted: true,
          },
        },
        ...(emailArray && emailArray.length ? { email: { in: emailArray } } : {}),
      },
      include: {
        profiles: {
          where: {
            organizationId: teamId,
          },
        },
        teams: {
          where: {
            teamId: teamId,
            accepted: true,
          },
          include: {
            team: {
              select: {
                id: true,
                name: true,
                slug: true,
                parentId: true,
                isOrganization: true,
              },
            },
          },
        },
      },
      skip,
      take,
    });
  }

  async getTeamUsersByEmailsWithOrgContext(
    teamId: number,
    organizationId?: number,
    emailArray?: string[],
    skip?: number,
    take?: number
  ) {
    return await this.dbRead.prisma.user.findMany({
      where: {
        teams: {
          some: {
            teamId: teamId,
            accepted: true,
          },
        },
        ...(emailArray && emailArray.length ? { email: { in: emailArray } } : {}),
      },
      include: {
        profiles: {
          where: organizationId
            ? {
                organizationId: organizationId,
              }
            : undefined,
        },
        teams: {
          where: {
            teamId: teamId,
            accepted: true,
          },
          include: {
            team: {
              select: {
                id: true,
                name: true,
                slug: true,
                parentId: true,
                isOrganization: true,
              },
            },
          },
        },
      },
      skip,
      take,
    });
  }

  async getTeamById(teamId: number) {
    return await this.dbRead.prisma.team.findUnique({
      where: {
        id: teamId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        isOrganization: true,
        parent: {
          select: {
            id: true,
            name: true,
            isOrganization: true,
          },
        },
      },
    });
  }

  async isUserTeamMember(teamId: number, userId: number) {
    const membership = await this.dbRead.prisma.membership.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
      select: {
        accepted: true,
        role: true,
      },
    });

    return membership?.accepted ? membership : null;
  }
}
