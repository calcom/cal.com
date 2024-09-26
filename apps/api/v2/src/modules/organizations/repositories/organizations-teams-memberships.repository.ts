import { Injectable } from "@nestjs/common";

import { CreateOrgTeamMembershipDto } from "../inputs/create-organization-team-membership.input";
import { UpdateOrgTeamMembershipDto } from "../inputs/update-organization-team-membership.input";

@Injectable()
export class OrganizationsTeamsMembershipsRepository {
  // TODO: PrismaReadService
  async findOrgTeamMembershipsPaginated(organizationId: number, teamId: number, skip: number, take: number) {
    // return this.dbRead.prisma.membership.findMany({
    //   where: {
    //     teamId: teamId,
    //     team: {
    //       parentId: organizationId,
    //     },
    //   },
    //   skip,
    //   take,
    // });
  }
  // TODO: PrismaReadService
  async findOrgTeamMembership(organizationId: number, teamId: number, membershipId: number) {
    // return this.dbRead.prisma.membership.findUnique({
    //   where: {
    //     id: membershipId,
    //     teamId: teamId,
    //     team: {
    //       parentId: organizationId,
    //     },
    //   },
    // });
  }
  // TODO: PrismaWriteService
  async deleteOrgTeamMembershipById(organizationId: number, teamId: number, membershipId: number) {
    // return this.dbWrite.prisma.membership.delete({
    //   where: {
    //     id: membershipId,
    //     teamId: teamId,
    //     team: {
    //       parentId: organizationId,
    //     },
    //   },
    // });
  }
  // TODO: PrismaWriteService
  async updateOrgTeamMembershipById(
    organizationId: number,
    teamId: number,
    membershipId: number,
    data: UpdateOrgTeamMembershipDto
  ) {
    // return this.dbWrite.prisma.membership.update({
    //   data: { ...data },
    //   where: {
    //     id: membershipId,
    //     teamId: teamId,
    //     team: {
    //       parentId: organizationId,
    //     },
    //   },
    // });
  }
  // TODO: PrismaWriteService
  async createOrgTeamMembership(teamId: number, data: CreateOrgTeamMembershipDto) {
    // return this.dbWrite.prisma.membership.create({
    //   data: { ...data, teamId: teamId },
    // });
  }
}
