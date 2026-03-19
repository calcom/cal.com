import type { PrismaClient } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

export interface IOrgMembershipRepository {
  getOrgIdsWhereAdmin(loggedInUserId: number): Promise<number[]>;
  isLoggedInUserOrgAdminOfBookingHost(loggedInUserId: number, bookingUserId: number): Promise<boolean>;
}

export class PrismaOrgMembershipRepository implements IOrgMembershipRepository {
  constructor(private prismaClient: PrismaClient) {}

  async getOrgIdsWhereAdmin(loggedInUserId: number) {
    const loggedInUserOrgMemberships = await this.prismaClient.membership.findMany({
      where: {
        userId: loggedInUserId,
        role: {
          in: [MembershipRole.OWNER, MembershipRole.ADMIN],
        },
        team: {
          parentId: null,
        },
      },
      select: {
        teamId: true,
      },
    });

    return loggedInUserOrgMemberships.map((m) => m.teamId);
  }

  async isLoggedInUserOrgAdminOfBookingHost(loggedInUserId: number, bookingUserId: number) {
    const orgIdsWhereLoggedInUserAdmin = await this.getOrgIdsWhereAdmin(loggedInUserId);

    if (orgIdsWhereLoggedInUserAdmin.length === 0) {
      return false;
    }

    const bookingUserOrgMembership = await this.prismaClient.membership.findFirst({
      where: {
        userId: bookingUserId,
        teamId: {
          in: orgIdsWhereLoggedInUserAdmin,
        },
        team: {
          parentId: null,
        },
      },
      select: {
        userId: true,
      },
    });

    if (bookingUserOrgMembership) return true;

    const bookingUserOrgTeamMembership = await this.prismaClient.membership.findFirst({
      where: {
        userId: bookingUserId,
        team: {
          parentId: {
            in: orgIdsWhereLoggedInUserAdmin,
          },
        },
      },
    });

    return !!bookingUserOrgTeamMembership;
  }
}
