import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";

import { MembershipRole } from "@calcom/prisma/client";

@Injectable()
export class MembershipsRepository {
  constructor(private readonly dbRead: PrismaReadService) {}

  async findOrgUserMembership(organizationId: number, userId: number) {
    const membership = await this.dbRead.prisma.membership.findUniqueOrThrow({
      where: {
        userId_teamId: {
          userId: userId,
          teamId: organizationId,
        },
      },
    });

    return membership;
  }

  async findMembershipByTeamId(teamId: number, userId: number) {
    const membership = await this.dbRead.prisma.membership.findUnique({
      where: {
        userId_teamId: {
          userId: userId,
          teamId: teamId,
        },
      },
    });

    return membership;
  }

  async findMembershipByOrgId(orgId: number, userId: number) {
    return this.findMembershipByTeamId(orgId, userId);
  }

  async isUserOrganizationAdmin(userId: number, organizationId: number) {
    const adminMembership = await this.dbRead.prisma.membership.findFirst({
      where: {
        userId,
        teamId: organizationId,
        accepted: true,
        OR: [{ role: "ADMIN" }, { role: "OWNER" }],
      },
    });

    return !!adminMembership;
  }

  async createMembership(teamId: number, userId: number, role: MembershipRole, accepted: boolean) {
    const membership = await this.dbRead.prisma.membership.create({
      data: {
        role,
        teamId,
        userId,
        accepted,
      },
    });

    return membership;
  }
}
