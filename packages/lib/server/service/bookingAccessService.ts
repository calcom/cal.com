import type { PrismaClient } from "@calcom/prisma";

import { BookingRepository } from "../repository/booking";
import { UserRepository } from "../repository/user";

export class BookingAccessService {
  constructor(private prismaClient: PrismaClient) {}

  /**
   * Determines if a user has access to a booking based on:
   * 1. Being the booking organizer
   * 2. Being a team/org admin where the event type belongs
   * 3. Being an org admin where the booking organizer belongs (for personal bookings)
   * 4. Being a team admin of any team the booking organizer belongs to (for personal bookings)
   */
  async doesUserIdHaveAccessToBooking({
    userId,
    bookingId,
  }: {
    userId: number;
    bookingId: number;
  }): Promise<boolean> {
    const bookingRepo = new BookingRepository(this.prismaClient);
    const userRepo = new UserRepository(this.prismaClient);

    const booking = await bookingRepo.getBookingWithEventTypeTeamId({ bookingId });

    if (!booking) return false;

    // User is the organizer
    if (userId === booking.userId) return true;

    // If booking has a teamId, check if user is admin of that team/org
    if (booking.eventType?.teamId) {
      const isAdminOrUser = await userRepo.isAdminOfTeamOrParentOrg({
        userId,
        teamId: booking.eventType.teamId,
      });
      return isAdminOrUser;
    }

    if (!booking.userId) return false;

    const bookingOwner = await userRepo.getUserOrganizationAndTeams({ userId: booking.userId });

    if (!bookingOwner) return false;

    // Check if user is admin of booking organizer's organization
    if (bookingOwner.organizationId) {
      const isOrgAdmin = await userRepo.isAdminOfTeamOrParentOrg({
        userId,
        teamId: bookingOwner.organizationId,
      });
      if (isOrgAdmin) return true;
    }

    // Check if user is admin of any team the booking organizer belongs to
    for (const membership of bookingOwner.teams) {
      const isTeamAdmin = await userRepo.isAdminOfTeamOrParentOrg({
        userId,
        teamId: membership.teamId,
      });
      if (isTeamAdmin) return true;
    }

    return false;
  }
}
