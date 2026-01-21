import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";

import { MembershipRole } from "@calcom/platform-libraries";

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

  async findPlatformOwnerUserId(organizationId: number): Promise<number | undefined> {
    const owner = await this.dbRead.prisma.membership.findFirst({
      where: {
        teamId: organizationId,
        role: "OWNER",
        accepted: true,
      },
      select: {
        userId: true,
      },
    });

    return owner?.userId ?? undefined;
  }

  async findPlatformAdminUserId(organizationId: number): Promise<number | undefined> {
    const admin = await this.dbRead.prisma.membership.findFirst({
      where: {
        teamId: organizationId,
        role: "ADMIN",
        accepted: true,
      },
      select: {
        userId: true,
      },
    });

    return admin?.userId ?? undefined;
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

  async findUserMemberships(userId: number) {
    const memberships = await this.dbRead.prisma.membership.findMany({
      where: {
        userId,
      },
    });

    return memberships;
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

  async getOrgIdsWhereUserIsAdminOrOwner(userId: number) {
    const userOrgAdminMemberships = await this.dbRead.prisma.membership.findMany({
      where: {
        userId: userId,
        accepted: true,
        role: {
          in: ["OWNER", "ADMIN"],
        },
        team: {
          parentId: null,
        },
      },
      select: {
        teamId: true,
      },
    });

    return userOrgAdminMemberships.map((m: { teamId: number }) => m.teamId);
  }

  async createMembership(teamId: number, userId: number, role: MembershipRole, accepted: boolean) {
    const membership = await this.dbRead.prisma.membership.create({
      data: {
        createdAt: new Date(),
        role,
        teamId,
        userId,
        accepted,
      },
    });

    return membership;
  }

  async getUserAdminOrOwnerTeamMembership(userId: number, teamId: number) {
    return this.dbRead.prisma.membership.findFirst({
      where: {
        userId: userId,
        teamId: teamId,
        accepted: true,
        role: {
          in: ["OWNER", "ADMIN"],
        },
      },
    });
  }

  async getUserMembershipInOneOfOrgs(userId: number, orgIds: number[]) {
    return this.dbRead.prisma.membership.findFirst({
      where: {
        userId: userId,
        accepted: true,
        teamId: {
          in: orgIds,
        },
        team: {
          parentId: null,
        },
      },
    });
  }

  async getUserMembershipInOneOfOrgsTeams(userId: number, orgIds: number[]) {
    return this.dbRead.prisma.membership.findFirst({
      where: {
        userId: userId,
        accepted: true,
        team: {
          parentId: {
            in: orgIds,
          },
        },
      },
    });
  }
}
