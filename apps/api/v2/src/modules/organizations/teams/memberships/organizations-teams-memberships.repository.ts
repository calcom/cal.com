import type { MembershipRole } from "@calcom/prisma/enums";
import { Injectable } from "@nestjs/common";
import { CreateOrgTeamMembershipDto } from "@/modules/organizations/teams/memberships/inputs/create-organization-team-membership.input";
import { UpdateOrgTeamMembershipDto } from "@/modules/organizations/teams/memberships/inputs/update-organization-team-membership.input";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { MembershipUserSelect } from "@/modules/teams/memberships/teams-memberships.repository";

@Injectable()
export class OrganizationsTeamsMembershipsRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService
  ) {}

  async findOrgTeamMembershipsPaginated(organizationId: number, teamId: number, skip: number, take: number) {
    return await this.dbRead.prisma.membership.findMany({
      where: {
        teamId: teamId,
        team: {
          parentId: organizationId,
        },
      },
      include: { user: { select: MembershipUserSelect } },
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
      include: { user: { select: MembershipUserSelect } },
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
      include: { user: { select: MembershipUserSelect } },
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
      include: { user: { select: MembershipUserSelect } },
    });
  }

  async createOrgTeamMembershipWithOrgMembership(
    orgId: number,
    teamId: number,
    data: CreateOrgTeamMembershipDto,
    orgMembershipRole: MembershipRole,
    orgMembershipAccepted: boolean
  ) {
    return this.dbWrite.prisma.$transaction(async (tx) => {
      const teamMembership = await tx.membership.create({
        data: {
          createdAt: new Date(),
          ...data,
          teamId: teamId,
        },
        include: { user: { select: MembershipUserSelect } },
      });

      await tx.membership.upsert({
        where: {
          userId_teamId: { userId: data.userId, teamId: orgId },
        },
        update: {
          ...(orgMembershipAccepted ? { accepted: true } : {}),
        },
        create: {
          userId: data.userId,
          teamId: orgId,
          role: orgMembershipRole,
          accepted: orgMembershipAccepted,
          createdAt: new Date(),
        },
      });

      return teamMembership;
    });
  }
}
