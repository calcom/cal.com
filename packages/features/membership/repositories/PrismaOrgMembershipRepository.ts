import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

export class PrismaOrgMembershipRepository {
  static async getOrgIdsWhereAdmin(loggedInUserId: number) {
    const loggedInUserOrgMemberships = await prisma.membership.findMany({
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

  /**
   * Batch version of {@link isLoggedInUserOrgAdminOfBookingHost}: one org lookup + two membership queries
   * for the whole page instead of per booking.
   */
  static async getBookingHostUserIdsWhereLoggedInUserIsOrgAdmin(
    loggedInUserId: number,
    bookingHostUserIds: readonly number[]
  ): Promise<Set<number>> {
    const seen = new Set<number>();
    const uniqueHostIds: number[] = [];
    for (const id of bookingHostUserIds) {
      if (id > 0 && !seen.has(id)) {
        seen.add(id);
        uniqueHostIds.push(id);
      }
    }
    if (uniqueHostIds.length === 0) {
      return new Set();
    }

    const orgIdsWhereLoggedInUserAdmin =
      await PrismaOrgMembershipRepository.getOrgIdsWhereAdmin(loggedInUserId);
    if (orgIdsWhereLoggedInUserAdmin.length === 0) {
      return new Set();
    }

    const result = new Set<number>();

    const directOrgMembers = await prisma.membership.findMany({
      where: {
        userId: { in: uniqueHostIds },
        teamId: { in: orgIdsWhereLoggedInUserAdmin },
        team: {
          parentId: null,
        },
      },
      select: { userId: true },
    });
    for (const row of directOrgMembers) {
      result.add(row.userId);
    }

    const remaining = uniqueHostIds.filter((id) => !result.has(id));
    if (remaining.length === 0) {
      return result;
    }

    const childTeamMembers = await prisma.membership.findMany({
      where: {
        userId: { in: remaining },
        team: {
          parentId: {
            in: orgIdsWhereLoggedInUserAdmin,
          },
        },
      },
      select: { userId: true },
    });
    for (const row of childTeamMembers) {
      result.add(row.userId);
    }

    return result;
  }

  static async isLoggedInUserOrgAdminOfBookingHost(
    loggedInUserId: number,
    bookingUserId: number
  ): Promise<boolean> {
    const set = await PrismaOrgMembershipRepository.getBookingHostUserIdsWhereLoggedInUserIsOrgAdmin(
      loggedInUserId,
      [bookingUserId]
    );
    return set.has(bookingUserId);
  }
}
