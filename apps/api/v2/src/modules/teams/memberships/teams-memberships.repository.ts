import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { CreateTeamMembershipInput } from "@/modules/teams/memberships/inputs/create-team-membership.input";
import { UpdateTeamMembershipInput } from "@/modules/teams/memberships/inputs/update-team-membership.input";
import { Injectable } from "@nestjs/common";

@Injectable()
export class TeamsMembershipsRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async createTeamMembership(teamId: number, data: CreateTeamMembershipInput) {
    return this.dbWrite.prisma.membership.create({
      data: { ...data, teamId: teamId },
      include: { user: { select: { username: true, email: true, avatarUrl: true, name: true } } },
    });
  }

  async findTeamMembershipsPaginated(teamId: number, skip: number, take: number) {
    return await this.dbRead.prisma.membership.findMany({
      where: {
        teamId: teamId,
      },
      include: { user: { select: { username: true, email: true, avatarUrl: true, name: true } } },
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
      include: { user: { select: { username: true, email: true, avatarUrl: true, name: true } } },
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
      include: { user: { select: { username: true, email: true, avatarUrl: true, name: true } } },
    });
  }
}
