import { Injectable } from "@nestjs/common";

import { CreateOrgTeamDto } from "../inputs/create-organization-team.input";
import { UpdateOrgTeamDto } from "../inputs/update-organization-team.input";

@Injectable()
export class OrganizationsTeamsRepository {
  // TODO: PrismaReadService
  async findOrgTeam(organizationId: number, teamId: number) {
    // return this.dbRead.prisma.team.findUnique({
    //   where: {
    //     id: teamId,
    //     isOrganization: false,
    //     parentId: organizationId,
    //   },
    // });
  }
  // TODO: PrismaReadService
  async findOrgTeams(organizationId: number) {
    // return this.dbRead.prisma.team.findMany({
    //   where: {
    //     parentId: organizationId,
    //   },
    // });
  }
  // TODO: PrismaReadService
  async deleteOrgTeam(organizationId: number, teamId: number) {
    // return this.dbRead.prisma.team.delete({
    //   where: {
    //     id: teamId,
    //     isOrganization: false,
    //     parentId: organizationId,
    //   },
    // });
  }
  // TODO: PrismaReadService
  async createOrgTeam(organizationId: number, data: CreateOrgTeamDto) {
    // return this.dbRead.prisma.team.create({
    //   data: { ...data, parentId: organizationId },
    // });
  }
  // TODO: PrismaReadService
  async createPlatformOrgTeam(organizationId: number, oAuthClientId: string, data: CreateOrgTeamDto) {
    // return this.dbRead.prisma.team.create({
    //   data: {
    //     ...data,
    //     parentId: organizationId,
    //     createdByOAuthClientId: oAuthClientId,
    //   },
    // });
  }
  // TODO: PrismaReadService
  async getPlatformOrgTeams(organizationId: number, oAuthClientId: string) {
    // return this.dbRead.prisma.team.findMany({
    //   where: {
    //     parentId: organizationId,
    //     createdByOAuthClientId: oAuthClientId,
    //   },
    // });
  }
  // TODO: PrismaReadService
  async updateOrgTeam(organizationId: number, teamId: number, data: UpdateOrgTeamDto) {
    // return this.dbRead.prisma.team.update({
    //   data: { ...data },
    //   where: { id: teamId, parentId: organizationId, isOrganization: false },
    // });
  }
  // TODO: PrismaReadService
  async findOrgTeamsPaginated(organizationId: number, skip: number, take: number) {
    // return this.dbRead.prisma.team.findMany({
    //   where: {
    //     parentId: organizationId,
    //   },
    //   skip,
    //   take,
    // });
  }
  // TODO: PrismaReadService
  async findOrgUserTeamsPaginated(organizationId: number, userId: number, skip: number, take: number) {
    // return this.dbRead.prisma.team.findMany({
    //   where: {
    //     parentId: organizationId,
    //     members: {
    //       some: {
    //         userId,
    //       },
    //     },
    //   },
    //   include: {
    //     members: { select: { accepted: true, userId: true } },
    //   },
    //   skip,
    //   take,
    // });
  }
  // TODO: PrismaReadService
  async getTeamMembersIds(teamId: number) {
    // const team = await this.dbRead.prisma.team.findUnique({
    //   where: {
    //     id: teamId,
    //   },
    //   include: {
    //     members: true,
    //   },
    // });
    // if (!team) {
    //   return [];
    // }
    // return team.members.map((member) => member.userId);
  }
}
