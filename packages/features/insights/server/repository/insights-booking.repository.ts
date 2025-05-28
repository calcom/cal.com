import type { Prisma } from "@prisma/client";

import { prisma } from "@calcom/prisma";
import type { readonlyPrisma } from "@calcom/prisma";
import type { BookingTimeStatusDenormalized } from "@calcom/prisma/client";

import type {
  FindManyOptions,
  IInsightsBookingRepository,
  InsightsFilters,
} from "./insights-booking.interface";

export class InsightsBookingRepository implements IInsightsBookingRepository {
  private authorizationConditions: Prisma.BookingTimeStatusDenormalizedWhereInput;
  private filterConditions: Prisma.BookingTimeStatusDenormalizedWhereInput;
  private prismaClient: typeof readonlyPrisma;

  constructor(
    userId: number,
    filters: InsightsFilters,
    ctx?: {
      userIsOwnerAdminOfParentTeam?: boolean;
      userOrganizationId?: number | null;
      prismaClient?: typeof readonlyPrisma;
    }
  ) {
    this.prismaClient = ctx?.prismaClient || prisma;
    this.authorizationConditions = this.buildAuthorizationConditions(userId, {
      userIsOwnerAdminOfParentTeam: ctx?.userIsOwnerAdminOfParentTeam || false,
      userOrganizationId: ctx?.userOrganizationId || null,
    });
    this.filterConditions = this.buildFilterConditions(filters);
  }

  /**
   * Builds authorization conditions to ensure users can only access data they're allowed to see
   * This is a security-critical method that ensures data access control
   */
  private buildAuthorizationConditions(
    userId: number,
    ctx: {
      userIsOwnerAdminOfParentTeam: boolean;
      userOrganizationId: number | null;
    }
  ): Prisma.BookingTimeStatusDenormalizedWhereInput {
    if (ctx.userIsOwnerAdminOfParentTeam && ctx.userOrganizationId) {
      return {
        OR: [
          {
            teamId: ctx.userOrganizationId,
            isTeamBooking: true,
          },
          {
            userId,
          },
        ],
      };
    } else {
      return { userId };
    }
  }

  /**
   * Builds filter conditions based on provided filters
   * These are applied in addition to authorization conditions
   */
  private buildFilterConditions(filters: InsightsFilters): Prisma.BookingTimeStatusDenormalizedWhereInput {
    const conditions: Prisma.BookingTimeStatusDenormalizedWhereInput[] = [];

    if (filters.eventTypeId) {
      conditions.push({
        OR: [{ eventTypeId: filters.eventTypeId }, { eventParentId: filters.eventTypeId }],
      });
    }

    if (filters.memberUserId) {
      conditions.push({ userId: filters.memberUserId });
    }

    if (conditions.length === 0) {
      return {};
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    return { AND: conditions };
  }

  /**
   * Find bookings with combined authorization and filter conditions
   */
  async findMany(options: FindManyOptions = {}): Promise<BookingTimeStatusDenormalized[]> {
    return this.prismaClient.bookingTimeStatusDenormalized.findMany({
      ...options,
      where: {
        AND: [this.authorizationConditions, this.filterConditions, options.where || {}],
      },
    });
  }

  /**
   * Count bookings with combined authorization and filter conditions
   */
  async count(options: FindManyOptions = {}): Promise<number> {
    return this.prismaClient.bookingTimeStatusDenormalized.count({
      ...options,
      where: {
        AND: [this.authorizationConditions, this.filterConditions, options.where || {}],
      },
    });
  }
}
