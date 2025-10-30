import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import type { PrismaClient } from "@calcom/prisma";
import { UserPermissionRole, MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

export class BookingAuthorizationService {
  constructor(private prismaClient: PrismaClient) {}

  /**
   * Checks if a user is authorized to perform booking operations (confirm, reschedule, cancel)
   * on a specific booking. This includes:
   * - System-wide admin permission
   * - Booking ownership
   * - Event type association (host or user)
   * - Team admin/owner role
   * - Organization admin status
   */
  async checkBookingAuthorization({
    eventTypeId,
    loggedInUserId,
    teamId,
    bookingUserId,
    userRole,
  }: {
    eventTypeId: number | null;
    loggedInUserId: number;
    teamId?: number | null;
    bookingUserId: number | null;
    userRole: UserPermissionRole;
  }): Promise<void> {
    // Check system-wide admin
    if (userRole === UserPermissionRole.ADMIN) return;
    if (bookingUserId === loggedInUserId) return;

    if (eventTypeId) {
      const isUserAssociatedWithEventType = await this.isUserAssociatedWithEventType(
        eventTypeId,
        loggedInUserId
      );
      if (isUserAssociatedWithEventType) return;
    }

    if (teamId) {
      const isTeamAdmin = await this.isUserTeamAdmin(loggedInUserId, teamId);
      if (isTeamAdmin) return;
    }

    if (bookingUserId && (await this.isUserOrgAdminOfBookingUser(loggedInUserId, bookingUserId))) {
      return;
    }

    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User is not authorized to perform this booking operation",
    });
  }

  private async isUserAssociatedWithEventType(eventTypeId: number, userId: number): Promise<boolean> {
    const eventType = await this.prismaClient.eventType.findFirst({
      where: {
        id: eventTypeId,
        OR: [{ hosts: { some: { userId } } }, { users: { some: { id: userId } } }],
      },
      select: { id: true },
    });

    return !!eventType;
  }

  private async isUserTeamAdmin(userId: number, teamId: number): Promise<boolean> {
    const membership = await MembershipRepository.getAdminOrOwnerMembership(userId, teamId);
    return !!membership;
  }

  private async isUserOrgAdminOfBookingUser(loggedInUserId: number, bookingUserId: number): Promise<boolean> {
    const orgIdsWhereLoggedInUserAdmin = await this.getOrgIdsWhereAdmin(loggedInUserId);

    if (orgIdsWhereLoggedInUserAdmin.length === 0) {
      return false;
    }

    // Check if booking user is directly a member of any org where logged-in user is admin
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
        id: true,
      },
    });

    if (bookingUserOrgMembership) return true;

    // Check if booking user is a member of a team that belongs to an org where logged-in user is admin
    const bookingUserOrgTeamMembership = await this.prismaClient.membership.findFirst({
      where: {
        userId: bookingUserId,
        team: {
          parentId: {
            in: orgIdsWhereLoggedInUserAdmin,
          },
        },
      },
      select: {
        id: true,
      },
    });

    return !!bookingUserOrgTeamMembership;
  }

  private async getOrgIdsWhereAdmin(userId: number): Promise<number[]> {
    const loggedInUserOrgMemberships = await this.prismaClient.membership.findMany({
      where: {
        userId,
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
}
