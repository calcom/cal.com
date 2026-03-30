import type { PrismaClient } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";

const BOOKING_DETAIL_LIMIT = 100;

export class ActiveUserBillingRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  /**
   * Get all managed user emails for a platform org identified by its PlatformBilling subscription ID.
   */
  async getManagedUserEmailsBySubscriptionId(subscriptionId: string): Promise<{ email: string }[]> {
    return this.prismaClient.user.findMany({
      distinct: ["email"],
      where: {
        isPlatformManaged: true,
        profiles: {
          some: {
            organization: {
              platformBilling: {
                subscriptionId,
              },
            },
          },
        },
      },
      select: {
        email: true,
      },
    });
  }

  /**
   * Get all member emails for a regular organization identified by its org (team) ID.
   * Uses the Membership table to find accepted org members.
   */
  async getOrgMemberEmailsByOrgId(orgId: number): Promise<{ email: string }[]> {
    return this.prismaClient.user.findMany({
      distinct: ["email"],
      where: {
        teams: {
          some: {
            teamId: orgId,
            accepted: true,
          },
        },
      },
      select: {
        email: true,
      },
    });
  }

  async getOrgMemberDetailsByOrgId(
    orgId: number
  ): Promise<{ id: number; email: string; name: string | null }[]> {
    return this.prismaClient.user.findMany({
      distinct: ["email"],
      where: {
        teams: {
          some: {
            teamId: orgId,
            accepted: true,
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
  }

  /**
   * Find platform-managed users (by email) who hosted at least one booking in the given period.
   * Filters on isPlatformManaged to match only platform org users.
   */
  async getActivePlatformUsersAsHost(
    subscriptionId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{ email: string }[]> {
    return this.prismaClient.user.findMany({
      distinct: ["email"],
      where: {
        isPlatformManaged: true,
        profiles: {
          some: {
            organization: {
              platformBilling: {
                subscriptionId,
              },
            },
          },
        },
        bookings: {
          some: {
            userId: { not: null },
            status: BookingStatus.ACCEPTED,
            startTime: {
              gte: periodStart,
              lt: periodEnd,
            },
          },
        },
      },
      select: {
        email: true,
      },
    });
  }

  /**
   * Find users (by email) who hosted at least one booking in the given period.
   */
  async getActiveUsersAsHost(
    userEmails: string[],
    periodStart: Date,
    periodEnd: Date
  ): Promise<{ email: string }[]> {
    return this.prismaClient.user.findMany({
      distinct: ["email"],
      where: {
        email: { in: userEmails },
        bookings: {
          some: {
            userId: { not: null },
            status: BookingStatus.ACCEPTED,
            startTime: {
              gte: periodStart,
              lt: periodEnd,
            },
          },
        },
      },
      select: {
        email: true,
      },
    });
  }

  async getBookingsByHostUserId(
    userId: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<
    Array<{
      id: number;
      uid: string;
      title: string;
      startTime: Date;
      endTime: Date;
      attendees: Array<{ email: string; name: string | null }>;
    }>
  > {
    return this.prismaClient.booking.findMany({
      where: {
        userId,
        status: BookingStatus.ACCEPTED,
        startTime: { gte: periodStart, lt: periodEnd },
      },
      orderBy: { startTime: "desc" },
      take: BOOKING_DETAIL_LIMIT,
      select: {
        id: true,
        uid: true,
        title: true,
        startTime: true,
        endTime: true,
        attendees: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async getBookingsByAttendeeEmail(
    email: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<
    Array<{
      id: number;
      uid: string;
      title: string;
      startTime: Date;
      endTime: Date;
      user: { name: string | null; email: string } | null;
    }>
  > {
    return this.prismaClient.booking.findMany({
      where: {
        attendees: { some: { email } },
        status: BookingStatus.ACCEPTED,
        startTime: { gte: periodStart, lt: periodEnd },
      },
      orderBy: { startTime: "desc" },
      take: BOOKING_DETAIL_LIMIT,
      select: {
        id: true,
        uid: true,
        title: true,
        startTime: true,
        endTime: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Find users (by email) who attended at least one booking in the given period.
   */
  async getActiveUsersAsAttendee(
    userEmails: string[],
    periodStart: Date,
    periodEnd: Date
  ): Promise<{ email: string }[]> {
    return this.prismaClient.attendee.findMany({
      distinct: ["email"],
      where: {
        email: { in: userEmails },
        booking: {
          status: BookingStatus.ACCEPTED,
          startTime: {
            gte: periodStart,
            lt: periodEnd,
          },
        },
      },
      select: {
        email: true,
      },
    });
  }
}
