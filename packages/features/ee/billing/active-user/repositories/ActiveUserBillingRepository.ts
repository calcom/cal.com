import type { PrismaClient } from "@calcom/prisma/client";

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
            startTime: {
              gte: periodStart,
              lte: periodEnd,
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
            startTime: {
              gte: periodStart,
              lte: periodEnd,
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
          startTime: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
      },
      select: {
        email: true,
      },
    });
  }
}
