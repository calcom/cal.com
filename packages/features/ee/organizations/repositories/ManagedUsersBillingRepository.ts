import type { PrismaClient } from "@calcom/prisma/client";

export class ManagedUsersBillingRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async getManagedUserEmailsByOrgId(organizationId: number): Promise<{ email: string }[]> {
    return this.prismaClient.user.findMany({
      distinct: ["email"],
      where: {
        isPlatformManaged: true,
        profiles: {
          some: {
            organizationId,
          },
        },
      },
      select: {
        email: true,
      },
    });
  }

  async getActiveManagedUsersAsHost(organizationId: number, startTime: Date, endTime: Date): Promise<{ email: string }[]> {
    return this.prismaClient.user.findMany({
      distinct: ["email"],
      where: {
        isPlatformManaged: true,
        profiles: {
          some: {
            organizationId,
          },
        },
        bookings: {
          some: {
            userId: { not: null },
            startTime: {
              gte: startTime,
              lte: endTime,
            },
          },
        },
      },
      select: {
        email: true,
      },
    });
  }

  async getActiveManagedUsersAsAttendee(managedUsersEmails: string[], startTime: Date, endTime: Date): Promise<{ email: string }[]> {
    return this.prismaClient.attendee.findMany({
      distinct: ["email"],
      where: {
        email: { in: managedUsersEmails },
        booking: {
          startTime: {
            gte: startTime,
            lte: endTime,
          },
        },
      },
      select: {
        email: true,
      },
    });
  }
}
