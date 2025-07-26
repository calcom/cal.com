import { Prisma } from "@prisma/client";
import { z } from "zod";

import type { readonlyPrisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { MembershipRepository } from "../repository/membership";
import { TeamRepository } from "../repository/team";

// Utility function to build user hash map with avatar URL fallback
export const buildHashMapForUsers = <
  T extends { avatarUrl: string | null; id: number; username: string | null; [key: string]: unknown }
>(
  usersFromTeam: T[]
) => {
  const userHashMap = new Map<number | null, Omit<T, "avatarUrl"> & { avatarUrl: string }>();
  usersFromTeam.forEach((user) => {
    userHashMap.set(user.id, {
      ...user,
      // TODO: Use AVATAR_FALLBACK when avatar.png endpoint is fased out
      avatarUrl: user.avatarUrl || `/${user.username}/avatar.png`,
    });
  });
  return userHashMap;
};

// Type definition for BookingTimeStatusDenormalized view
export type BookingTimeStatusDenormalized = z.infer<typeof bookingDataSchema>;

// Helper type for select parameter
export type BookingSelect = {
  [K in keyof BookingTimeStatusDenormalized]?: boolean;
};

// Helper type for selected fields
export type SelectedFields<T> = T extends undefined
  ? BookingTimeStatusDenormalized
  : {
      [K in keyof T as T[K] extends true ? K : never]: K extends keyof BookingTimeStatusDenormalized
        ? BookingTimeStatusDenormalized[K]
        : never;
    };

export const bookingDataSchema = z
  .object({
    id: z.number(),
    uid: z.string(),
    eventTypeId: z.number().nullable(),
    title: z.string(),
    description: z.string().nullable(),
    startTime: z.date(),
    endTime: z.date(),
    createdAt: z.date(),
    updatedAt: z.date().nullable(),
    location: z.string().nullable(),
    paid: z.boolean(),
    status: z.string(), // BookingStatus enum
    rescheduled: z.boolean().nullable(),
    userId: z.number().nullable(),
    teamId: z.number().nullable(),
    eventLength: z.number().nullable(),
    eventParentId: z.number().nullable(),
    userEmail: z.string().nullable(),
    userName: z.string().nullable(),
    userUsername: z.string().nullable(),
    ratingFeedback: z.string().nullable(),
    rating: z.number().nullable(),
    noShowHost: z.boolean().nullable(),
    isTeamBooking: z.boolean(),
    timeStatus: z.string().nullable(),
  })
  .strict();

export const insightsBookingServiceOptionsSchema = z.discriminatedUnion("scope", [
  z.object({
    scope: z.literal("user"),
    userId: z.number(),
    orgId: z.number(),
  }),
  z.object({
    scope: z.literal("org"),
    userId: z.number(),
    orgId: z.number(),
  }),
  z.object({
    scope: z.literal("team"),
    userId: z.number(),
    orgId: z.number(),
    teamId: z.number(),
  }),
]);

export type InsightsBookingServicePublicOptions = {
  scope: "user" | "org" | "team";
  userId: number;
  orgId: number;
  teamId?: number;
};

export type InsightsBookingServiceOptions = z.infer<typeof insightsBookingServiceOptionsSchema>;

export type InsightsBookingServiceFilterOptions = z.infer<typeof insightsBookingServiceFilterOptionsSchema>;

export const insightsBookingServiceFilterOptionsSchema = z.object({
  eventTypeId: z.number().optional(),
  memberUserId: z.number().optional(),
  dateRange: z
    .object({
      target: z.enum(["createdAt", "startTime"]),
      startDate: z.string(),
      endDate: z.string(),
    })
    .optional(),
});

const NOTHING_CONDITION = Prisma.sql`1=0`;

const bookingDataKeys = new Set(Object.keys(bookingDataSchema.shape));

export class InsightsBookingService {
  private prisma: typeof readonlyPrisma;
  private options: InsightsBookingServiceOptions | null;
  private filters: InsightsBookingServiceFilterOptions | null;
  private cachedAuthConditions?: Prisma.Sql;
  private cachedFilterConditions?: Prisma.Sql | null;

  constructor({
    prisma,
    options,
    filters,
  }: {
    prisma: typeof readonlyPrisma;
    options: InsightsBookingServicePublicOptions;
    filters?: InsightsBookingServiceFilterOptions;
  }) {
    this.prisma = prisma;
    const optionsValidated = insightsBookingServiceOptionsSchema.safeParse(options);
    this.options = optionsValidated.success ? optionsValidated.data : null;

    const filtersValidated = insightsBookingServiceFilterOptionsSchema.safeParse(filters);
    this.filters = filtersValidated.success ? filtersValidated.data : null;
  }

  // KPI Stats Methods - 4 consolidated methods for BookingKPICards
  async getBookingCountByStatus(status?: "completed" | "rescheduled" | "cancelled") {
    const baseConditions = await this.getBaseConditions();

    let statusCondition = Prisma.sql``;
    if (status === "completed") {
      statusCondition = Prisma.sql`AND "timeStatus" = 'completed'`;
    } else if (status === "rescheduled") {
      statusCondition = Prisma.sql`AND "timeStatus" = 'rescheduled'`;
    } else if (status === "cancelled") {
      statusCondition = Prisma.sql`AND "timeStatus" = 'cancelled'`;
    }
    // For undefined status, no additional condition (all bookings)

    const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions} ${statusCondition}
    `;
    return Number(result[0]?.count || 0);
  }

  async getNoShowCount(type: "host" | "guest") {
    const baseConditions = await this.getBaseConditions();

    if (type === "host") {
      const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM "BookingTimeStatusDenormalized"
        WHERE ${baseConditions} AND "noShowHost" = true
      `;
      return Number(result[0]?.count || 0);
    } else {
      const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM "Attendee" a
        INNER JOIN "BookingTimeStatusDenormalized" b ON a."bookingId" = b.id
        WHERE ${baseConditions} AND a."noShow" = true
      `;
      return Number(result[0]?.count || 0);
    }
  }

  async getAverageRating() {
    const baseConditions = await this.getBaseConditions();
    const result = await this.prisma.$queryRaw<Array<{ avg_rating: number | null }>>`
      SELECT AVG("rating") as avg_rating
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions} AND "rating" IS NOT NULL
    `;
    return result[0]?.avg_rating || 0;
  }

  async getCSATScore() {
    const baseConditions = await this.getBaseConditions();
    const result = await this.prisma.$queryRaw<Array<{ total_ratings: bigint; ratings_above_3: bigint }>>`
      SELECT 
        COUNT(CASE WHEN "rating" IS NOT NULL THEN 1 END) as total_ratings,
        COUNT(CASE WHEN "rating" > 3 THEN 1 END) as ratings_above_3
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions}
    `;
    const stats = result[0];
    if (!stats || Number(stats.total_ratings) === 0) {
      return 0;
    }
    return Number(stats.ratings_above_3) / Number(stats.total_ratings);
  }

  // Consolidated methods for other components (not KPI cards)
  async getMembersStatsWithCount(type: "all" | "cancelled" | "noShow", sortOrder: "ASC" | "DESC") {
    const baseConditions = await this.getBaseConditions();

    let statusCondition = Prisma.sql``;
    if (type === "cancelled") {
      statusCondition = Prisma.sql`AND "timeStatus" = 'cancelled'`;
    } else if (type === "noShow") {
      statusCondition = Prisma.sql`AND "noShowHost" = true`;
    }
    // For "all", no additional condition needed

    const results = await this.prisma.$queryRaw<
      Array<{
        userId: number;
        count: bigint;
      }>
    >`
      SELECT 
        "userId",
        COUNT(*) as count
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions} ${statusCondition}
        AND "userId" IS NOT NULL
      GROUP BY "userId"
      ORDER BY count ${sortOrder === "ASC" ? Prisma.sql`ASC` : Prisma.sql`DESC`}
      LIMIT 10
    `;

    if (results.length === 0) {
      return [];
    }

    const userIds = results.map((r) => r.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });

    const userMap = new Map(users.map((user) => [user.id, user]));

    return results
      .map((result) => {
        const user = userMap.get(result.userId);
        if (!user) return null;
        return {
          userId: result.userId,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
          },
          count: Number(result.count),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }

  async getMembersRatingStats(sortOrder: "ASC" | "DESC") {
    const baseConditions = await this.getBaseConditions();

    const results = await this.prisma.$queryRaw<
      Array<{
        userId: number;
        averageRating: number;
        totalRatings: bigint;
      }>
    >`
      SELECT 
        "userId",
        AVG("rating") as "averageRating",
        COUNT("rating") as "totalRatings"
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions}
        AND "userId" IS NOT NULL
        AND "rating" IS NOT NULL
      GROUP BY "userId"
      HAVING COUNT("rating") >= 1
      ORDER BY "averageRating" ${sortOrder === "ASC" ? Prisma.sql`ASC` : Prisma.sql`DESC`}
      LIMIT 10
    `;

    if (results.length === 0) {
      return [];
    }

    const userIds = results.map((r) => r.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });

    const userMap = new Map(users.map((user) => [user.id, user]));

    return results
      .map((result) => {
        const user = userMap.get(result.userId);
        if (!user) return null;
        return {
          userId: result.userId,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
          },
          count: Math.round(result.averageRating * 10) / 10, // Round to 1 decimal place
          totalRatings: Number(result.totalRatings),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }

  async getRecentRatingsStats() {
    const baseConditions = await this.getBaseConditions();

    const results = await this.prisma.$queryRaw<
      Array<{
        id: number;
        rating: number;
        ratingFeedback: string | null;
        createdAt: Date;
        userId: number;
        eventTypeId: number | null;
      }>
    >`
      SELECT 
        id,
        rating,
        "ratingFeedback",
        "createdAt",
        "userId",
        "eventTypeId"
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions}
        AND "rating" IS NOT NULL
      ORDER BY "createdAt" DESC
      LIMIT 10
    `;

    if (results.length === 0) {
      return [];
    }

    const userIds = results.map((r) => r.userId).filter((id): id is number => id !== null);
    const eventTypeIds = results.map((r) => r.eventTypeId).filter((id): id is number => id !== null);

    const [users, eventTypes] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true, avatarUrl: true },
      }),
      eventTypeIds.length > 0
        ? this.prisma.eventType.findMany({
            where: { id: { in: eventTypeIds } },
            select: { id: true, title: true },
          })
        : [],
    ]);

    const userMap = new Map(users.map((user) => [user.id, user]));
    const eventTypeMap = new Map(eventTypes.map((et) => [et.id, et]));

    return results
      .map((result) => {
        const user = userMap.get(result.userId);
        if (!user) return null;

        const eventType = result.eventTypeId ? eventTypeMap.get(result.eventTypeId) : null;

        return {
          id: result.id,
          rating: result.rating,
          feedback: result.ratingFeedback,
          createdAt: result.createdAt,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
          },
          eventType: eventType
            ? {
                id: eventType.id,
                title: eventType.title,
              }
            : null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }

  async getBaseConditions(): Promise<Prisma.Sql> {
    const authConditions = await this.getAuthorizationConditions();
    const filterConditions = await this.getFilterConditions();

    if (authConditions && filterConditions) {
      return Prisma.sql`((${authConditions}) AND (${filterConditions}))`;
    } else if (authConditions) {
      return Prisma.sql`(${authConditions})`;
    } else if (filterConditions) {
      return Prisma.sql`(${filterConditions})`;
    } else {
      return NOTHING_CONDITION;
    }
  }

  async getAuthorizationConditions(): Promise<Prisma.Sql> {
    if (this.cachedAuthConditions === undefined) {
      this.cachedAuthConditions = await this.buildAuthorizationConditions();
    }
    return this.cachedAuthConditions;
  }

  async getFilterConditions(): Promise<Prisma.Sql | null> {
    if (this.cachedFilterConditions === undefined) {
      this.cachedFilterConditions = await this.buildFilterConditions();
    }
    return this.cachedFilterConditions;
  }

  async buildFilterConditions(): Promise<Prisma.Sql | null> {
    const conditions: Prisma.Sql[] = [];

    if (!this.filters) {
      return null;
    }

    if (this.filters.eventTypeId) {
      conditions.push(
        Prisma.sql`("eventTypeId" = ${this.filters.eventTypeId}) OR ("eventParentId" = ${this.filters.eventTypeId})`
      );
    }

    if (this.filters.memberUserId) {
      conditions.push(Prisma.sql`"userId" = ${this.filters.memberUserId}`);
    }

    // Use dateRange object for date filtering
    if (this.filters.dateRange) {
      const { target, startDate, endDate } = this.filters.dateRange;
      if (startDate) {
        if (isNaN(Date.parse(startDate))) {
          throw new Error(`Invalid date format: ${startDate}`);
        }
        conditions.push(
          target === "createdAt"
            ? Prisma.sql`"createdAt" >= ${startDate}::timestamp`
            : Prisma.sql`"startTime" >= ${startDate}::timestamp`
        );
      }
      if (endDate) {
        if (isNaN(Date.parse(endDate))) {
          throw new Error(`Invalid date format: ${endDate}`);
        }
        conditions.push(
          target === "createdAt"
            ? Prisma.sql`"createdAt" <= ${endDate}::timestamp`
            : Prisma.sql`"startTime" <= ${endDate}::timestamp`
        );
      }
    }

    if (conditions.length === 0) {
      return null;
    }

    // Join all conditions with AND
    return conditions.reduce((acc, condition, index) => {
      if (index === 0) return condition;
      return Prisma.sql`(${acc}) AND (${condition})`;
    });
  }

  async buildAuthorizationConditions(): Promise<Prisma.Sql> {
    if (!this.options) {
      return NOTHING_CONDITION;
    }
    const isOwnerOrAdmin = await this.isOrgOwnerOrAdmin(this.options.userId, this.options.orgId);
    if (!isOwnerOrAdmin) {
      return NOTHING_CONDITION;
    }

    if (this.options.scope === "user") {
      return Prisma.sql`("userId" = ${this.options.userId}) AND ("teamId" IS NULL)`;
    } else if (this.options.scope === "org") {
      return await this.buildOrgAuthorizationCondition(this.options);
    } else if (this.options.scope === "team") {
      return await this.buildTeamAuthorizationCondition(this.options);
    } else {
      return NOTHING_CONDITION;
    }
  }

  private async buildOrgAuthorizationCondition(
    options: Extract<InsightsBookingServiceOptions, { scope: "org" }>
  ): Promise<Prisma.Sql> {
    // Get all teams from the organization
    const teamRepo = new TeamRepository(this.prisma);
    const teamsFromOrg = await teamRepo.findAllByParentId({
      parentId: options.orgId,
      select: { id: true },
    });
    const teamIds = [options.orgId, ...teamsFromOrg.map((t) => t.id)];

    // Get all users from the organization
    const userIdsFromOrg =
      teamsFromOrg.length > 0
        ? (await MembershipRepository.findAllByTeamIds({ teamIds, select: { userId: true } })).map(
            (m) => m.userId
          )
        : [];

    const conditions: Prisma.Sql[] = [Prisma.sql`("teamId" = ANY(${teamIds})) AND ("isTeamBooking" = true)`];

    if (userIdsFromOrg.length > 0) {
      const uniqueUserIds = Array.from(new Set(userIdsFromOrg));
      conditions.push(Prisma.sql`("userId" = ANY(${uniqueUserIds})) AND ("isTeamBooking" = false)`);
    }

    return conditions.reduce((acc, condition, index) => {
      if (index === 0) return condition;
      return Prisma.sql`(${acc}) OR (${condition})`;
    });
  }

  private async buildTeamAuthorizationCondition(
    options: Extract<InsightsBookingServiceOptions, { scope: "team" }>
  ): Promise<Prisma.Sql> {
    const teamRepo = new TeamRepository(this.prisma);
    const childTeamOfOrg = await teamRepo.findByIdAndParentId({
      id: options.teamId,
      parentId: options.orgId,
      select: { id: true },
    });
    if (!childTeamOfOrg) {
      return NOTHING_CONDITION;
    }

    const usersFromTeam = await MembershipRepository.findAllByTeamIds({
      teamIds: [options.teamId],
      select: { userId: true },
    });
    const userIdsFromTeam = usersFromTeam.map((u) => u.userId);

    const conditions: Prisma.Sql[] = [
      Prisma.sql`("teamId" = ${options.teamId}) AND ("isTeamBooking" = true)`,
    ];

    if (userIdsFromTeam.length > 0) {
      conditions.push(Prisma.sql`("userId" = ANY(${userIdsFromTeam})) AND ("isTeamBooking" = false)`);
    }

    return conditions.reduce((acc, condition, index) => {
      if (index === 0) return condition;
      return Prisma.sql`(${acc}) OR (${condition})`;
    });
  }

  // Helper method to calculate previous period stats for any KPI method
  async calculatePreviousPeriodStats<T>(
    currentMethod: () => Promise<T>
  ): Promise<{ count: T; deltaPrevious: number }> {
    if (!this.filters?.dateRange) {
      throw new Error("Date range is required for KPI stats");
    }

    // Get current period value
    const currentValue = await currentMethod();

    // Calculate previous period dates
    const startDate = new Date(this.filters.dateRange.startDate);
    const endDate = new Date(this.filters.dateRange.endDate);
    const diffInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - diffInDays);
    const previousEndDate = new Date(endDate);
    previousEndDate.setDate(previousEndDate.getDate() - diffInDays);

    // Create temporary filters for previous period
    const previousFilters = {
      ...this.filters,
      dateRange: {
        target: this.filters.dateRange.target,
        startDate: previousStartDate.toISOString(),
        endDate: previousEndDate.toISOString(),
      },
    };

    // Temporarily swap filters
    const originalFilters = this.filters;
    this.filters = previousFilters;
    this.cachedFilterConditions = undefined; // Clear cache

    try {
      const previousValue = await currentMethod();

      // Calculate percentage change
      const currentNum = typeof currentValue === "number" ? currentValue : 0;
      const previousNum = typeof previousValue === "number" ? previousValue : 0;

      let deltaPrevious = 0;
      if (previousNum > 0) {
        deltaPrevious = ((currentNum - previousNum) / previousNum) * 100;
      } else if (currentNum > 0) {
        deltaPrevious = 100; // 100% increase from 0
      }

      return {
        count: currentValue,
        deltaPrevious: Math.round(deltaPrevious * 100) / 100, // Round to 2 decimal places
      };
    } finally {
      // Restore original filters
      this.filters = originalFilters;
      this.cachedFilterConditions = undefined; // Clear cache
    }
  }

  async getCsvData({ limit = 100, offset = 0 }: { limit?: number; offset?: number }) {
    const baseConditions = await this.getBaseConditions();

    // Get total count first
    const totalCountResult = await this.prisma.$queryRaw<[{ count: number }]>`
      SELECT COUNT(*)::int as count
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions}
    `;
    const totalCount = totalCountResult[0]?.count || 0;

    // 1. Get booking data from BookingTimeStatusDenormalized
    const csvData = await this.prisma.$queryRaw<
      Array<{
        id: number;
        uid: string | null;
        title: string;
        createdAt: Date;
        timeStatus: string;
        eventTypeId: number | null;
        eventLength: number;
        startTime: Date;
        endTime: Date;
        paid: boolean;
        userEmail: string;
        userUsername: string;
        rating: number | null;
        ratingFeedback: string | null;
        noShowHost: boolean;
      }>
    >`
      SELECT
        "id",
        "uid",
        "title",
        "createdAt",
        "timeStatus",
        "eventTypeId",
        "eventLength",
        "startTime",
        "endTime",
        "paid",
        "userEmail",
        "userUsername",
        "rating",
        "ratingFeedback",
        "noShowHost"
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions}
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    if (csvData.length === 0) {
      return { data: csvData, total: totalCount };
    }

    const uids = csvData.filter((b) => b.uid !== null).map((b) => b.uid as string);

    if (uids.length === 0) {
      return { data: csvData, total: totalCount };
    }

    // 2. Get all bookings with their attendees and seat references
    const bookings = await this.prisma.booking.findMany({
      where: {
        uid: {
          in: uids,
        },
      },
      select: {
        uid: true,
        attendees: {
          select: {
            name: true,
            email: true,
            noShow: true,
          },
        },
        seatsReferences: {
          select: {
            attendee: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // 3. Create a map for quick lookup
    const bookingMap = new Map(bookings.map((booking) => [booking.uid, booking]));

    // 4. Merge the data
    const enrichedData = csvData.map((csvRow) => {
      const booking = bookingMap.get(csvRow.uid);

      let attendees: Array<{ name: string | null; email: string; noShow?: boolean }> = [];

      if (booking) {
        // Regular attendees
        attendees = booking.attendees.map((attendee) => ({
          name: attendee.name,
          email: attendee.email,
          noShow: attendee.noShow,
        }));

        // Seat references (for events with seats)
        const seatAttendees = booking.seatsReferences.map((seatRef) => ({
          name: seatRef.attendee.name,
          email: seatRef.attendee.email,
        }));

        attendees = [...attendees, ...seatAttendees];
      }

      return {
        ...csvRow,
        attendees,
      };
    });

    return { data: enrichedData, total: totalCount };
  }

  private async isOrgOwnerOrAdmin(userId: number, orgId: number): Promise<boolean> {
    // Check if the user is an owner or admin of the organization
    const membership = await MembershipRepository.findUniqueByUserIdAndTeamId({ userId, teamId: orgId });
    return Boolean(
      membership &&
        membership.accepted &&
        membership.role &&
        (membership.role === MembershipRole.OWNER || membership.role === MembershipRole.ADMIN)
    );
  }
}
