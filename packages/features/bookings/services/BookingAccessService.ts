import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import type { PrismaClient } from "@calcom/prisma";

import { BookingRepository } from "../repositories/BookingRepository";

type BookingForAccessCheck = NonNullable<Awaited<ReturnType<BookingRepository["findByUidIncludeEventType"]>>>;

export class BookingAccessService {
  constructor(private prismaClient: PrismaClient) {}

  private isUserAHost(userId: number, booking: BookingForAccessCheck): boolean {
    const hostMap = new Map<number, { id: number; email: string }>();

    const addHost = (id: number, email: string) => {
      if (!hostMap.has(id)) {
        hostMap.set(id, { id, email });
      }
    };

    booking?.eventType?.hosts?.forEach((host: { userId: number; user: { email: string } }) =>
      addHost(host.userId, host.user.email)
    );
    booking?.eventType?.users?.forEach((user: { id: number; email: string }) => addHost(user.id, user.email));

    if (booking?.user?.id && booking?.user?.email) {
      addHost(booking.user.id, booking.user.email);
    }

    const attendeeEmails = new Set(booking.attendees?.map((attendee: { email: string }) => attendee.email));
    const filteredHosts = Array.from(hostMap.values()).filter(
      (host) => attendeeEmails.has(host.email) || host.id === booking.user?.id
    );

    return filteredHosts.some((host) => host.id === userId);
  }

  /**
   * Determines if a user has access to a booking based on:
   * 1. Being the booking organizer
   * 2. Being one of the hosts in a multi-host booking
   * 3. Being a team/org admin where the event type belongs
   * 4. Being an org admin where the booking organizer belongs (for personal bookings)
   * 5. Being a team admin of any team the booking organizer belongs to (for personal bookings)
   */
  async doesUserIdHaveAccessToBooking({
    userId,
    bookingUid,
  }: {
    userId: number;
    bookingUid: string;
  }): Promise<boolean> {
    const bookingRepo = new BookingRepository(this.prismaClient);
    const userRepo = new UserRepository(this.prismaClient);

    const booking = await bookingRepo.findByUidIncludeEventType({ bookingUid });

    if (!booking) return false;

    if (userId === booking.userId) return true;

    if (this.isUserAHost(userId, booking)) return true;

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
