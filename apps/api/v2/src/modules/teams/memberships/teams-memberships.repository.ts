import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { CreateTeamMembershipInput } from "@/modules/teams/memberships/inputs/create-team-membership.input";
import { UpdateTeamMembershipInput } from "@/modules/teams/memberships/inputs/update-team-membership.input";
import { Injectable } from "@nestjs/common";

import type { Prisma } from "@calcom/prisma/client";

export interface TeamMembershipFilters {
  emails?: string[];
}

export const MembershipUserSelect: Prisma.UserSelect = {
  username: true,
  email: true,
  avatarUrl: true,
  name: true,
  metadata: true,
  bio: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class TeamsMembershipsRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async createTeamMembership(teamId: number, data: CreateTeamMembershipInput) {
    return this.dbWrite.prisma.membership.create({
      data: {
        createdAt: new Date(),
        ...data,
        teamId: teamId,
      },
      include: { user: { select: MembershipUserSelect } },
    });
  }

  async findTeamMembershipsPaginated(teamId: number, skip: number, take: number) {
    return await this.dbRead.prisma.membership.findMany({
      where: {
        teamId: teamId,
      },
      include: { user: { select: MembershipUserSelect } },
      skip,
      take,
    });
  }

  async findTeamMembershipsPaginatedWithFilters(
    teamId: number,
    filters: TeamMembershipFilters,
    skip: number,
    take: number
  ) {
    const whereClause: Prisma.MembershipWhereInput = {
      teamId: teamId,
    };

    if (filters.emails && filters.emails.length > 0) {
      whereClause.user = {
        email: { in: filters.emails },
      };
    }

    return await this.dbRead.prisma.membership.findMany({
      where: whereClause,
      include: { user: { select: MembershipUserSelect } },
      skip,
      take,
    });
  }

  async findTeamMembership(teamId: number, membershipId: number) {
    return this.dbRead.prisma.membership.findUnique({
      where: {
        id: membershipId,
        teamId: teamId,
      },
      include: { user: { select: MembershipUserSelect } },
    });
  }

  async findTeamMembershipsByNameAndUser(teamName: string, userId: number) {
    return this.dbRead.prisma.membership.findFirst({
      where: {
        team: {
          name: teamName,
        },
        userId,
      },
    });
  }

  async deleteTeamMembershipById(teamId: number, membershipId: number) {
    return this.dbWrite.prisma.membership.delete({
      where: {
        id: membershipId,
        teamId: teamId,
      },
    });
  }

  async updateTeamMembershipById(teamId: number, membershipId: number, data: UpdateTeamMembershipInput) {
    return this.dbWrite.prisma.membership.update({
      data: { ...data },
      where: {
        id: membershipId,
        teamId: teamId,
      },
      include: { user: { select: MembershipUserSelect } },
    });
  }
}
