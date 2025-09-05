import { Injectable } from "@nestjs/common";
import { CreateOrgTeamDto } from "@/modules/organizations/teams/index/inputs/create-organization-team.input";
import { UpdateOrgTeamDto } from "@/modules/organizations/teams/index/inputs/update-organization-team.input";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

@Injectable()
export class OrganizationsTeamsRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService
  ) {}

  async findOrgTeam(organizationId: number, teamId: number) {
    return this.dbRead.prisma.team.findUnique({
      where: {
        id: teamId,
        isOrganization: false,
        parentId: organizationId,
      },
    });
  }

  async findOrgTeamBySlug(organizationId: number, teamSlug: string) {
    return this.dbRead.prisma.team.findUnique({
      where: {
        slug_parentId: {
          slug: teamSlug,
          parentId: organizationId,
        },
        isOrganization: false,
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

  async findOrgTeamsPaginatedWithMembers(organizationId: number, skip: number, take: number) {
    return this.dbRead.prisma.team.findMany({
      where: {
        parentId: organizationId,
      },
      include: {
        members: { select: { accepted: true, userId: true, role: true } },
      },
      skip,
      take,
    });
  }
}
