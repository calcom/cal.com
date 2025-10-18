import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import type { PrismaClient } from "@calcom/prisma";
import { UserPermissionRole, MembershipRole } from "@calcom/prisma/enums";

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

    // Check if the user is the owner of the booking
    if (bookingUserId === loggedInUserId) return;

    // Check if user is associated with the event type
    if (eventTypeId) {
      const isUserAssociatedWithEventType = await this.isUserAssociatedWithEventType(
        eventTypeId,
        loggedInUserId
      );
      if (isUserAssociatedWithEventType) return;
    }

    // Check if the user is an admin/owner of the team the booking belongs to
    if (teamId) {
      const isTeamAdmin = await this.isUserTeamAdmin(loggedInUserId, teamId);
      if (isTeamAdmin) return;
    }

    // Check if user is org admin of the booking user
    if (bookingUserId && (await this.isUserOrgAdminOfBookingUser(loggedInUserId, bookingUserId))) {
      return;
    }

    throw new Error("User is not authorized to perform this booking operation");
  }

  /**
   * Checks if a user is associated with an event type (as host or user)
   */
  private async isUserAssociatedWithEventType(eventTypeId: number, userId: number): Promise<boolean> {
    const eventType = await this.prismaClient.eventType.findUnique({
      where: {
        id: eventTypeId,
        OR: [{ hosts: { some: { userId } } }, { users: { some: { id: userId } } }],
      },
      select: { id: true },
    });

    return !!eventType;
  }

  /**
   * Checks if a user is an admin or owner of a team
   */
  private async isUserTeamAdmin(userId: number, teamId: number): Promise<boolean> {
    const membership = await MembershipRepository.getAdminOrOwnerMembership(userId, teamId);
    return !!membership;
  }

  /**
   * Checks if the logged-in user is an organization admin of the booking user
   */
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
    });

    return !!bookingUserOrgTeamMembership;
  }

  /**
   * Gets all organization IDs where the user has admin or owner role
   */
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
