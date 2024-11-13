import { CreateOrgTeamDto } from "@/modules/organizations/inputs/create-organization-team.input";
import { UpdateOrgTeamDto } from "@/modules/organizations/inputs/update-organization-team.input";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import { credentialForCalendarServiceSelect } from "@calcom/platform-libraries";

@Injectable()
export class OrganizationsTeamsRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async findOrgTeam(organizationId: number, teamId: number) {
    return this.dbRead.prisma.team.findUnique({
      where: {
        id: teamId,
        isOrganization: false,
        parentId: organizationId,
      },
    });
  }

  async findTeamById(teamId: number) {
    return this.dbRead.prisma.team.findUnique({
      where: {
        id: teamId,
      },
    });
  }

  async findOrgTeams(organizationId: number) {
    return this.dbRead.prisma.team.findMany({
      where: {
        parentId: organizationId,
      },
    });
  }

  async deleteOrgTeam(organizationId: number, teamId: number) {
    return this.dbWrite.prisma.team.delete({
      where: {
        id: teamId,
        isOrganization: false,
        parentId: organizationId,
      },
    });
  }

  async createOrgTeam(organizationId: number, data: CreateOrgTeamDto) {
    return this.dbWrite.prisma.team.create({
      data: { ...data, parentId: organizationId },
    });
  }

  async createPlatformOrgTeam(organizationId: number, oAuthClientId: string, data: CreateOrgTeamDto) {
    return this.dbWrite.prisma.team.create({
      data: {
        ...data,
        parentId: organizationId,
        createdByOAuthClientId: oAuthClientId,
      },
    });
  }

  async getPlatformOrgTeams(organizationId: number, oAuthClientId: string) {
    return this.dbRead.prisma.team.findMany({
      where: {
        parentId: organizationId,
        createdByOAuthClientId: oAuthClientId,
      },
    });
  }

  async updateOrgTeam(organizationId: number, teamId: number, data: UpdateOrgTeamDto) {
    return this.dbWrite.prisma.team.update({
      data: { ...data },
      where: { id: teamId, parentId: organizationId, isOrganization: false },
    });
  }

  async findOrgTeamsPaginated(organizationId: number, skip: number, take: number) {
    return this.dbRead.prisma.team.findMany({
      where: {
        parentId: organizationId,
      },
      skip,
      take,
    });
  }

  async findOrgUserTeamsPaginated(organizationId: number, userId: number, skip: number, take: number) {
    return this.dbRead.prisma.team.findMany({
      where: {
        parentId: organizationId,
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: { select: { accepted: true, userId: true, role: true } },
      },
      skip,
      take,
    });
  }

  async getTeamMembersIds(teamId: number) {
    const team = await this.dbRead.prisma.team.findUnique({
      where: {
        id: teamId,
      },
      include: {
        members: true,
      },
    });
    if (!team) {
      return [];
    }

    return team.members.map((member) => member.userId);
  }

  async getUserTeamsById(userId: number) {
    const userTeams = await this.dbRead.prisma.team.findMany({
      where: {
        members: {
          some: {
            userId,
            accepted: true,
          },
        },
      },
      select: {
        id: true,
        credentials: {
          select: credentialForCalendarServiceSelect,
        },
        name: true,
        logoUrl: true,
        members: {
          where: {
            userId,
          },
          select: {
            role: true,
          },
        },
        parent: {
          select: {
            id: true,
            credentials: {
              select: credentialForCalendarServiceSelect,
            },
            name: true,
            logoUrl: true,
            members: {
              where: {
                userId,
              },
              select: {
                role: true,
              },
            },
          },
        },
      },
    });

    return userTeams;
  }
}
