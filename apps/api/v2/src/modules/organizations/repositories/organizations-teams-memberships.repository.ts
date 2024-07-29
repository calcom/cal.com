import { CreateOrgTeamMembershipDto } from "@/modules/organizations/inputs/create-organization-team-membership.input";
import { UpdateOrgTeamMembershipDto } from "@/modules/organizations/inputs/update-organization-team-membership.input";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationsTeamsMembershipsRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async findOrgTeamMembershipsPaginated(organizationId: number, teamId: number, skip: number, take: number) {
    return this.dbRead.prisma.membership.findMany({
      where: {
        teamId: teamId,
        team: {
          parentId: organizationId,
        },
      },
      skip,
      take,
    });
  }

  async findOrgTeamMembership(organizationId: number, teamId: number, membershipId: number) {
    return this.dbRead.prisma.membership.findUnique({
      where: {
        id: membershipId,
        teamId: teamId,
        team: {
          parentId: organizationId,
        },
      },
    });
  }
  async deleteOrgTeamMembershipById(organizationId: number, teamId: number, membershipId: number) {
    return this.dbWrite.prisma.membership.delete({
      where: {
        id: membershipId,
        teamId: teamId,
        team: {
          parentId: organizationId,
        },
      },
    });
  }

  async updateOrgTeamMembershipById(
    organizationId: number,
    teamId: number,
    membershipId: number,
    data: UpdateOrgTeamMembershipDto
  ) {
    return this.dbWrite.prisma.membership.update({
      data: { ...data },
      where: {
        id: membershipId,
        teamId: teamId,
        team: {
          parentId: organizationId,
        },
      },
    });
  }

  async createOrgTeamMembership(teamId: number, data: CreateOrgTeamMembershipDto) {
    return this.dbWrite.prisma.membership.create({
      data: { ...data, teamId: teamId },
    });
  }
}
