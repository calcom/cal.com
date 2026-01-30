import md5 from "md5";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { makeSqlCondition } from "@calcom/features/data-table/lib/server";
import { ZColumnFilter } from "@calcom/features/data-table/lib/types";
import { type ColumnFilter } from "@calcom/features/data-table/lib/types";
import {
  isSingleSelectFilterValue,
  isMultiSelectFilterValue,
  isTextFilterValue,
  isNumberFilterValue,
  isDateRangeFilterValue,
} from "@calcom/features/data-table/lib/utils";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { extractDateRangeFromColumnFilters } from "@calcom/features/insights/lib/bookingUtils";
import type { DateRange } from "@calcom/features/insights/server/insightsDateUtils";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import type { PrismaClient } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

import { transformBookingsForCsv, type BookingTimeStatusData } from "./csvDataTransformer";

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

type UserStatsData = {
  userId: number;
  user: {
    id: number;
    username: string | null;
    name: string | null;
    email: string;
    avatarUrl: string;
  };
  emailMd5: string;
  count: number;
}[];

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
    orgId: z.number().nullish().optional(),
  }),
  z.object({
    scope: z.literal("org"),
    userId: z.number(),
    orgId: z.number(),
  }),
  z.object({
    scope: z.literal("team"),
    userId: z.number(),
    orgId: z.number().nullish().optional(),
    teamId: z.number(),
  }),
]);

export type InsightsBookingServicePublicOptions = {
  scope: "user" | "org" | "team";
  userId: number;
  orgId: number | null | undefined;
  teamId?: number;
};

export type InsightsBookingServiceOptions = z.infer<typeof insightsBookingServiceOptionsSchema>;

export type InsightsBookingServiceFilterOptions = z.infer<typeof insightsBookingServiceFilterOptionsSchema>;

export const insightsBookingServiceFilterOptionsSchema = z.object({
  columnFilters: z.array(ZColumnFilter).optional(),
});

const NOTHING_CONDITION = Prisma.sql`1=0`;

const bookingDataKeys = new Set(Object.keys(bookingDataSchema.shape));

export class InsightsBookingBaseService {
  private prisma: PrismaClient;
  private options: InsightsBookingServiceOptions | null;
  private filters: InsightsBookingServiceFilterOptions | null;
  private cachedAuthConditions?: Prisma.Sql;
  private cachedFilterConditions?: Prisma.Sql | null;

  constructor({
    prisma,
    options,
    filters,
  }: {
    prisma: PrismaClient;
    options: InsightsBookingServicePublicOptions;
    filters?: InsightsBookingServiceFilterOptions;
  }) {
    this.prisma = prisma;
    const optionsValidated = insightsBookingServiceOptionsSchema.safeParse(options);
    this.options = optionsValidated.success ? optionsValidated.data : null;

    const filtersValidated = insightsBookingServiceFilterOptionsSchema.safeParse(filters);
    this.filters = filtersValidated.success ? filtersValidated.data : null;
  }

  async getBookingsByHourStats({ timeZone }: { timeZone: string }) {
    const baseConditions = await this.getBaseConditions();

    const query = Prisma.sql`
      SELECT
        EXTRACT(HOUR FROM ("startTime" AT TIME ZONE 'UTC' AT TIME ZONE ${timeZone}))::int as "hour",
        COUNT(*)::int as "count"
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions}
        AND "status" = 'accepted'
      GROUP BY 1
      ORDER BY 1
    `;

    const results = await this.prisma.$queryRaw<
      Array<{
        hour: string;
        count: number;
      }>
    >(query);

    // Create a map of results by hour for easy lookup
    const resultsMap = new Map(results.map((row) => [Number(row.hour), row.count]));

    // Return all 24 hours (0-23), filling with 0 values for missing data
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: resultsMap.get(hour) || 0,
    }));
  }

  async findAll<TSelect extends BookingSelect | undefined = undefined>({
    select,
  }: {
    select?: TSelect;
  } = {}): Promise<Array<SelectedFields<TSelect>>> {
    const baseConditions = await this.getBaseConditions();

    // Build the select clause with validated fields
    let selectFields = Prisma.sql`*`;
    if (select) {
      const keys = Object.keys(select);
      if (keys.some((key) => !bookingDataKeys.has(key))) {
        throw new Error("Invalid select keys provided");
      }

      if (keys.length > 0) {
        // Use Prisma.sql for each field to ensure proper escaping
        const sqlFields = keys.map((field) => Prisma.sql`"${Prisma.raw(field)}"`);
        selectFields = Prisma.join(sqlFields, ", ");
      }
    }

    const query = Prisma.sql`
      SELECT ${selectFields}
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions}
    `;

    return await this.prisma.$queryRaw<Array<SelectedFields<TSelect>>>(query);
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

    // Process columnFilters using type-safe utility functions
    if (this.filters.columnFilters) {
      for (const filter of this.filters.columnFilters) {
        const condition = this.buildColumnFilterCondition(filter);
        if (condition) {
          conditions.push(condition);
        }
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

  private buildColumnFilterCondition(filter: ColumnFilter): Prisma.Sql | null {
    const { id, value } = filter;

    if (!value) {
      return null;
    }

    if (id === "eventTypeId" && isMultiSelectFilterValue(value)) {
      const eventTypeIds = value.data.map((id) => Number(id));

      if (eventTypeIds.length === 0) {
        return null;
      }

      return Prisma.sql`("eventTypeId" IN (${Prisma.join(eventTypeIds)}) OR "eventParentId" IN (${Prisma.join(
        eventTypeIds
      )}))`;
    }

    if (id === "userId" && isSingleSelectFilterValue(value) && typeof value.data === "number") {
      return Prisma.sql`"userId" = ${value.data}`;
    }

    if (id === "status" && isMultiSelectFilterValue(value)) {
      const statusValues = value.data.map((status) => Prisma.sql`${status}::"BookingStatus"`);
      return Prisma.sql`"status" IN (${Prisma.join(statusValues)})`;
    }

    if (id === "paid" && isSingleSelectFilterValue(value)) {
      const paidValue = value.data === "true";
      return Prisma.sql`"paid" = ${paidValue}`;
    }

    if (id === "userEmail" && isTextFilterValue(value)) {
      const condition = makeSqlCondition(value);
      if (condition) {
        return Prisma.sql`"userEmail" ${condition}`;
      }
    }

    if (id === "userName" && isTextFilterValue(value)) {
      const condition = makeSqlCondition(value);
      if (condition) {
        return Prisma.sql`"userName" ${condition}`;
      }
    }

    if (id === "rating" && isNumberFilterValue(value)) {
      const condition = makeSqlCondition(value);
      if (condition) {
        return Prisma.sql`"rating" ${condition}`;
      }
    }

    if ((id === "startTime" || id === "createdAt") && isDateRangeFilterValue(value)) {
      const conditions: Prisma.Sql[] = [];
      // if `startTime` filter -> x <= "startTime" AND "endTime" <= y
      // if `createdAt` filter -> x <= "createdAt" AND "createdAt" <= y
      if (value.data.startDate) {
        if (isNaN(Date.parse(value.data.startDate))) {
          throw new Error(`Invalid date format: ${value.data.startDate}`);
        }
        if (id === "startTime") {
          conditions.push(Prisma.sql`${value.data.startDate}::timestamp <= "startTime"`);
        } else {
          conditions.push(Prisma.sql`${value.data.startDate}::timestamp <= "createdAt"`);
        }
      }
      if (value.data.endDate) {
        if (isNaN(Date.parse(value.data.endDate))) {
          throw new Error(`Invalid date format: ${value.data.endDate}`);
        }
        if (id === "startTime") {
          conditions.push(Prisma.sql`"endTime" <= ${value.data.endDate}::timestamp`);
        } else {
          conditions.push(Prisma.sql`"createdAt" <= ${value.data.endDate}::timestamp`);
        }
      }
      if (conditions.length === 0) {
        return null;
      }
      return conditions.reduce((acc, condition, index) => {
        if (index === 0) return condition;
        return Prisma.sql`(${acc}) AND (${condition})`;
      });
    }

    return null;
  }

  async buildAuthorizationConditions(): Promise<Prisma.Sql> {
    if (!this.options) {
      return NOTHING_CONDITION;
    }
    const scope = this.options.scope;
    const targetId =
      scope === "org" ? this.options.orgId : scope === "team" ? this.options.teamId : undefined;

    if (targetId && scope !== "user") {
      const isOwnerOrAdmin = await this.isOwnerOrAdmin(this.options.userId, targetId);
      if (!isOwnerOrAdmin) {
        return NOTHING_CONDITION;
      }
    }

    if (scope === "user") {
      return Prisma.sql`("userId" = ${this.options.userId}) AND ("teamId" IS NULL)`;
    } else if (scope === "org") {
      return await this.buildOrgAuthorizationCondition(this.options);
    } else if (scope === "team") {
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
    const teamIds = [options.orgId, ...teamsFromOrg.map((t) => t.id)].sort((a, b) => a - b);

    // Get all users from the organization
    const userIdsFromOrg =
      teamsFromOrg.length > 0
        ? (await MembershipRepository.findAllByTeamIds({ teamIds, select: { userId: true } })).map(
            (m) => m.userId
          )
        : [];

    const conditions: Prisma.Sql[] = [Prisma.sql`("teamId" = ANY(${teamIds})) AND ("isTeamBooking" = true)`];

    if (userIdsFromOrg.length > 0) {
      const uniqueUserIds = Array.from(new Set(userIdsFromOrg)).sort((a, b) => a - b);
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

    if (options.orgId) {
      // team under org
      const childTeamOfOrg = await teamRepo.findByIdAndParentId({
        id: options.teamId,
        parentId: options.orgId,
        select: { id: true },
      });
      if (!childTeamOfOrg) {
        // teamId and its orgId does not match
        return NOTHING_CONDITION;
      }
    } else {
      // standalone team
      const team = await teamRepo.findById({
        id: options.teamId,
      });
      if (team?.parentId) {
        // a team without orgId is not supposed to have parentId
        return NOTHING_CONDITION;
      }
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

  async getCsvData({
    limit = 100,
    offset = 0,
    timeZone,
  }: {
    limit?: number;
    offset?: number;
    timeZone: string;
  }) {
    const baseConditions = await this.getBaseConditions();

    // Get total count first
    const totalCountQuery = Prisma.sql`
      SELECT COUNT(*)::int as count
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions}
    `;

    const totalCountResult = await this.prisma.$queryRaw<[{ count: number }]>(totalCountQuery);
    const totalCount = totalCountResult[0]?.count || 0;

    // 1. Get booking data from BookingTimeStatusDenormalized
    const query = Prisma.sql`
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
        "userName",
        "userUsername",
        "ratingFeedback",
        "rating",
        "noShowHost",
        "isTeamBooking"
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions}
      ORDER BY "startTime" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const bookingsFromSelected = await this.prisma.$queryRaw<
      Array<{
        id: number;
        uid: string | null;
        title: string;
        createdAt: Date;
        timeStatus: string;
        eventTypeId: number | null;
        eventLength: number | null;
        startTime: Date;
        endTime: Date;
        paid: boolean;
        userEmail: string | null;
        userName: string | null;
        userUsername: string | null;
        ratingFeedback: string | null;
        rating: number | null;
        noShowHost: boolean | null;
        isTeamBooking: boolean;
      }>
    >(query);

    const csvData = transformBookingsForCsv(bookingsFromSelected, timeZone);

    return {
      data: csvData,
      totalCount,
    };
  }

  async getKPIStats({
    startDate,
    endDate,
    previousStartDate,
    previousEndDate,
  }: {
    startDate: string;
    endDate: string;
    previousStartDate: string;
    previousEndDate: string;
  }) {
    const baseConditions = await this.getBaseConditions();

    const query = Prisma.sql`
      WITH current_period AS (
        SELECT
          COUNT(id)::int as total_count,
          COUNT(CASE WHEN status = 'accepted' AND "endTime" <= NOW() THEN 1 END)::int as completed_count,
          COUNT(CASE WHEN rescheduled = true THEN 1 END)::int as rescheduled_count,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::int as cancelled_count,
          AVG(rating)::float as avg_rating,
          COUNT(CASE WHEN "noShowHost" = true THEN 1 END)::int as no_show_count
        FROM "BookingTimeStatusDenormalized"
        WHERE ${baseConditions}
          AND "createdAt" >= ${startDate}::timestamp
          AND "createdAt" <= ${endDate}::timestamp
      ),
      previous_period AS (
        SELECT
          COUNT(id)::int as total_count,
          COUNT(CASE WHEN status = 'accepted' AND "endTime" <= NOW() THEN 1 END)::int as completed_count,
          COUNT(CASE WHEN rescheduled = true THEN 1 END)::int as rescheduled_count,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::int as cancelled_count,
          AVG(rating)::float as avg_rating,
          COUNT(CASE WHEN "noShowHost" = true THEN 1 END)::int as no_show_count
        FROM "BookingTimeStatusDenormalized"
        WHERE ${baseConditions}
          AND "createdAt" >= ${previousStartDate}::timestamp
          AND "createdAt" <= ${previousEndDate}::timestamp
      )
      SELECT
        c.total_count as current_total,
        p.total_count as previous_total,
        c.completed_count as current_completed,
        p.completed_count as previous_completed,
        c.rescheduled_count as current_rescheduled,
        p.rescheduled_count as previous_rescheduled,
        c.cancelled_count as current_cancelled,
        p.cancelled_count as previous_cancelled,
        c.avg_rating as current_rating,
        p.avg_rating as previous_rating,
        c.no_show_count as current_no_show,
        p.no_show_count as previous_no_show
      FROM current_period c, previous_period p
    `;

    const stats = await this.prisma.$queryRaw<
      Array<{
        current_total: number;
        previous_total: number;
        current_completed: number;
        previous_completed: number;
        current_rescheduled: number;
        previous_rescheduled: number;
        current_cancelled: number;
        previous_cancelled: number;
        current_rating: number | null;
        previous_rating: number | null;
        current_no_show: number;
        previous_no_show: number;
      }>
    >(query);

    const result = stats[0];

    return {
      created: {
        count: result.current_total,
        deltaPrevious: result.current_total - result.previous_total,
      },
      completed: {
        count: result.current_completed,
        deltaPrevious: result.current_completed - result.previous_completed,
      },
      rescheduled: {
        count: result.current_rescheduled,
        deltaPrevious: result.current_rescheduled - result.previous_rescheduled,
      },
      cancelled: {
        count: result.current_cancelled,
        deltaPrevious: result.current_cancelled - result.previous_cancelled,
      },
      rating: {
        count: result.current_rating || 0,
        deltaPrevious: (result.current_rating || 0) - (result.previous_rating || 0),
      },
      no_show: {
        count: result.current_no_show,
        deltaPrevious: result.current_no_show - result.previous_no_show,
      },
    };
  }

  async getMembersStatsWithCount({
    type = "all",
    sortOrder = "DESC",
    completed,
  }: {
    type?: "all" | "accepted" | "cancelled" | "noShow";
    sortOrder?: "ASC" | "DESC";
    completed?: boolean;
  } = {}): Promise<UserStatsData> {
    const baseConditions = await this.getBaseConditions();
    const conditions: Prisma.Sql[] = [Prisma.sql`"userId" IS NOT NULL`];

    if (type === "cancelled") {
      conditions.push(Prisma.sql`status = 'cancelled'`);
    } else if (type === "noShow") {
      conditions.push(Prisma.sql`"noShowHost" = true`);
    } else if (type === "accepted") {
      conditions.push(Prisma.sql`status = 'accepted'`);
    }

    if (completed) {
      conditions.push(Prisma.sql`"endTime" <= NOW()`);
    }

    const additionalCondition = conditions.reduce((acc, condition, index) => {
      if (index === 0) return condition;
      return Prisma.sql`(${acc}) AND (${condition})`;
    });

    const query = Prisma.sql`
      SELECT
        "userId",
        COUNT(id)::int as count
      FROM "BookingTimeStatusDenormalized"
      WHERE (${baseConditions}) AND (${additionalCondition})
      GROUP BY "userId"
      ORDER BY count ${sortOrder === "ASC" ? Prisma.sql`ASC` : Prisma.sql`DESC`}
      LIMIT 10
    `;

    const bookingsFromTeam = await this.prisma.$queryRaw<
      Array<{
        userId: number;
        count: number;
      }>
    >(query);

    if (bookingsFromTeam.length === 0) {
      return [];
    }

    const userIds = bookingsFromTeam.map((booking) => booking.userId);

    const usersFromTeam = await this.prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        avatarUrl: true,
      },
    });

    const userHashMap = buildHashMapForUsers(usersFromTeam);

    const result = bookingsFromTeam
      .map((booking) => {
        const user = userHashMap.get(booking.userId);
        if (!user) {
          return null;
        }

        return {
          userId: booking.userId,
          user,
          emailMd5: md5(user.email || ""),
          count: booking.count,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return result;
  }

  async getMembersRatingStats(sortOrder: "ASC" | "DESC" = "DESC"): Promise<UserStatsData> {
    const baseConditions = await this.getBaseConditions();

    const query = Prisma.sql`
      SELECT
        "userId",
        AVG("rating")::float as "count"
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions} AND "userId" IS NOT NULL AND "rating" IS NOT NULL
      GROUP BY "userId"
      ORDER BY "count" ${sortOrder === "ASC" ? Prisma.sql`ASC` : Prisma.sql`DESC`}
      LIMIT 10
    `;

    const bookingsFromTeam = await this.prisma.$queryRaw<
      Array<{
        userId: number;
        count: number;
      }>
    >(query);

    if (bookingsFromTeam.length === 0) {
      return [];
    }

    const userIds = bookingsFromTeam.map((booking) => booking.userId);

    const usersFromTeam = await this.prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        avatarUrl: true,
      },
    });

    const userHashMap = buildHashMapForUsers(usersFromTeam);

    const result = bookingsFromTeam
      .map((booking) => {
        const user = userHashMap.get(booking.userId);
        if (!user) {
          return null;
        }

        return {
          userId: booking.userId,
          user,
          emailMd5: md5(user.email || ""),
          count: parseFloat(booking.count.toFixed(1)),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return result;
  }

  async getRecentNoShowGuests() {
    const baseConditions = await this.getBaseConditions();

    const query = Prisma.sql`
      SELECT
        "id",
        "uid",
        "title",
        "startTime",
        "userEmail",
        "userName"
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions} AND "noShowHost" = true
      ORDER BY "startTime" DESC
      LIMIT 10
    `;

    return await this.prisma.$queryRaw<
      Array<{
        id: number;
        uid: string;
        title: string;
        startTime: Date;
        userEmail: string | null;
        userName: string | null;
      }>
    >(query);
  }

  async getNoShowHostsOverTimeStats({
    timeZone,
    dateRanges,
  }: {
    timeZone: string;
    dateRanges: DateRange[];
  }) {
    const baseConditions = await this.getBaseConditions();

    const stats = await Promise.all(
      dateRanges.map(async (range) => {
        const query = Prisma.sql`
          SELECT
            COUNT(id)::int as count
          FROM "BookingTimeStatusDenormalized"
          WHERE ${baseConditions}
            AND "noShowHost" = true
            AND "startTime" >= ${range.start.toISOString()}::timestamp
            AND "startTime" <= ${range.end.toISOString()}::timestamp
        `;

        const result = await this.prisma.$queryRaw<[{ count: number }]>(query);
        return {
          date: range.start,
          count: result[0]?.count || 0,
        };
      })
    );

    const result = stats.map((stat) => {
      const formattedDate = dayjs(stat.date).tz(timeZone).format("MMM D");
      const formattedDateFull = dayjs(stat.date).tz(timeZone).format("MMM D, YYYY");

      return {
        formattedDateFull: formattedDateFull,
        Month: formattedDate,
        "No Show": stat.count,
      };
    });

    return result;
  }

  async getPopularEventsStats() {
    const baseConditions = await this.getBaseConditions();

    const query = Prisma.sql`
      SELECT
        "eventTypeId",
        COUNT(id)::int as count
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions} AND "eventTypeId" IS NOT NULL
      GROUP BY "eventTypeId"
      ORDER BY count DESC
      LIMIT 10
    `;

    const bookingsFromSelected = await this.prisma.$queryRaw<
      Array<{
        eventTypeId: number;
        count: number;
      }>
    >(query);

    const eventTypeIds = bookingsFromSelected.map((booking) => booking.eventTypeId);

    if (eventTypeIds.length === 0) {
      return [];
    }

    const eventTypesFrom = await this.prisma.eventType.findMany({
      select: {
        id: true,
        title: true,
        teamId: true,
        userId: true,
        slug: true,
        users: {
          select: {
            username: true,
          },
        },
        team: {
          select: {
            slug: true,
          },
        },
      },
      where: {
        id: {
          in: eventTypeIds,
        },
      },
    });

    const eventTypeHashMap = new Map(eventTypesFrom.map((eventType) => [eventType.id, eventType]));

    const result = bookingsFromSelected
      .map((booking) => {
        const eventTypeSelected = eventTypeHashMap.get(booking.eventTypeId);
        if (!eventTypeSelected) {
          return null;
        }

        let eventSlug = "";
        if (eventTypeSelected.userId) {
          eventSlug = `${eventTypeSelected?.users[0]?.username}/${eventTypeSelected?.slug}`;
        }

        if (eventTypeSelected?.team && eventTypeSelected?.team?.slug) {
          eventSlug = `${eventTypeSelected.team.slug}/${eventTypeSelected.slug}`;
        }

        return {
          eventTypeId: booking.eventTypeId,
          eventTypeName: eventSlug,
          count: booking.count,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return result;
  }

  async getMostCancelledEventTypesStats() {
    const baseConditions = await this.getBaseConditions();

    const query = Prisma.sql`
      SELECT
        "eventTypeId",
        COUNT(id)::int as count
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions} AND "eventTypeId" IS NOT NULL AND status = 'cancelled'
      GROUP BY "eventTypeId"
      ORDER BY count DESC
      LIMIT 10
    `;

    const bookingsFromSelected = await this.prisma.$queryRaw<
      Array<{
        eventTypeId: number;
        count: number;
      }>
    >(query);

    const eventTypeIds = bookingsFromSelected.map((booking) => booking.eventTypeId);

    if (eventTypeIds.length === 0) {
      return [];
    }

    const eventTypesFrom = await this.prisma.eventType.findMany({
      select: {
        id: true,
        title: true,
        teamId: true,
        userId: true,
        slug: true,
        users: {
          select: {
            username: true,
          },
        },
        team: {
          select: {
            slug: true,
          },
        },
      },
      where: {
        id: {
          in: eventTypeIds,
        },
      },
    });

    const eventTypeHashMap = new Map(eventTypesFrom.map((eventType) => [eventType.id, eventType]));

    const result = bookingsFromSelected
      .map((booking) => {
        const eventTypeSelected = eventTypeHashMap.get(booking.eventTypeId);
        if (!eventTypeSelected) {
          return null;
        }

        let eventSlug = "";
        if (eventTypeSelected.userId) {
          eventSlug = `${eventTypeSelected?.users[0]?.username}/${eventTypeSelected?.slug}`;
        }

        if (eventTypeSelected?.team && eventTypeSelected?.team?.slug) {
          eventSlug = `${eventTypeSelected.team.slug}/${eventTypeSelected.slug}`;
        }

        return {
          eventTypeId: booking.eventTypeId,
          eventTypeName: eventSlug,
          count: booking.count,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return result;
  }

  async getCSATOverTimeStats({ timeZone, dateRanges }: { timeZone: string; dateRanges: DateRange[] }) {
    const baseConditions = await this.getBaseConditions();

    const stats = await Promise.all(
      dateRanges.map(async (range) => {
        const query = Prisma.sql`
          SELECT
            AVG(rating)::float as avg_rating
          FROM "BookingTimeStatusDenormalized"
          WHERE ${baseConditions}
            AND rating IS NOT NULL
            AND "startTime" >= ${range.start.toISOString()}::timestamp
            AND "startTime" <= ${range.end.toISOString()}::timestamp
        `;

        const result = await this.prisma.$queryRaw<[{ avg_rating: number | null }]>(query);
        return {
          date: range.start,
          avg_rating: result[0]?.avg_rating || 0,
        };
      })
    );

    const result = stats.map((stat) => {
      const formattedDate = dayjs(stat.date).tz(timeZone).format("MMM D");
      const formattedDateFull = dayjs(stat.date).tz(timeZone).format("MMM D, YYYY");
      const csat = stat.avg_rating * 20; // Convert 1-5 rating to 0-100 CSAT

      return {
        formattedDateFull: formattedDateFull,
        Month: formattedDate,
        CSAT: parseFloat(csat.toFixed(1)),
      };
    });

    return result;
  }

  private async isOwnerOrAdmin(userId: number, targetId: number): Promise<boolean> {
    const permissionCheckService = new PermissionCheckService();
    return await permissionCheckService.checkPermission({
      userId,
      teamId: targetId,
      permission: "insights.read",
      fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
    });
  }
}
