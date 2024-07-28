import { CreateOrgTeamDto } from "@/modules/organizations/inputs/create-organization-team.input";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationsTeamsRepository {
  constructor(private readonly dbRead: PrismaReadService) {}

  async findOrgTeam(organizationId: number, teamId: number) {
    return this.dbRead.prisma.team.findUnique({
      where: {
        id: teamId,
        isOrganization: false,
        parentId: organizationId,
      },
    });
  }

  async deleteOrgTeam(organizationId: number, teamId: number) {
    return this.dbRead.prisma.team.delete({
      where: {
        id: teamId,
        isOrganization: false,
        parentId: organizationId,
      },
    });
  }

  async createOrgTeam(organizationId: number, data: CreateOrgTeamDto) {
    return this.dbRead.prisma.team.create({
      data: { ...data, parentId: organizationId },
    });
  }

  async updateOrgTeam(organizationId: number, teamId: number, data: CreateOrgTeamDto) {
    return this.dbRead.prisma.team.update({
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
        members: { select: { accepted: true, userId: true } },
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
}
