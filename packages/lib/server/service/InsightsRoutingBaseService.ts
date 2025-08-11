import { Prisma } from "@prisma/client";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { makeSqlCondition } from "@calcom/features/data-table/lib/server";
import type { FilterValue, TextFilterValue, TypedColumnFilter } from "@calcom/features/data-table/lib/types";
import type { ColumnFilterType } from "@calcom/features/data-table/lib/types";
import {
  isMultiSelectFilterValue,
  isTextFilterValue,
  isNumberFilterValue,
  isSingleSelectFilterValue,
} from "@calcom/features/data-table/lib/utils";
import type { DateRange } from "@calcom/features/insights/server/insightsDateUtils";
import type { readonlyPrisma } from "@calcom/prisma";
import type { BookingStatus } from "@calcom/prisma/enums";
import { MembershipRole } from "@calcom/prisma/enums";

import { MembershipRepository } from "../repository/membership";
import { TeamRepository } from "../repository/team";

export const insightsRoutingServiceOptionsSchema = z.discriminatedUnion("scope", [
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

export type InsightsRoutingServicePublicOptions = {
  scope: "user" | "org" | "team";
  userId: number;
  orgId: number | null;
  teamId: number | undefined;
};

export type InsightsRoutingServiceOptions = z.infer<typeof insightsRoutingServiceOptionsSchema>;

export type InsightsRoutingServiceFilterOptions = {
  startDate?: string;
  endDate?: string;
  columnFilters?: TypedColumnFilter<ColumnFilterType>[];
};

export type InsightsRoutingTableItem = {
  id: number;
  uuid: string | null;
  formId: string;
  formName: string;
  formTeamId: number | null;
  formUserId: number;
  bookingUid: string | null;
  bookingId: number | null;
  bookingStatus: BookingStatus | null;
  bookingStatusOrder: number | null;
  bookingCreatedAt: Date | null;
  bookingUserId: number | null;
  bookingUserName: string | null;
  bookingUserEmail: string | null;
  bookingUserAvatarUrl: string | null;
  bookingAssignmentReason: string | null;
  bookingStartTime: Date | null;
  bookingEndTime: Date | null;
  eventTypeId: number | null;
  eventTypeParentId: number | null;
  eventTypeSchedulingType: string | null;
  createdAt: Date;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  bookingAttendees: Array<{
    name: string;
    timeZone: string;
    email: string;
    phoneNumber: string | null;
  }>;
  fields: Array<{
    fieldId: string | null;
    valueString: string | null;
    valueNumber: number | null;
    valueStringArray: string[] | null;
  }>;
};

const NOTHING_CONDITION = Prisma.sql`1=0`;

// Define allowed column names for sorting to prevent SQL injection
const ALLOWED_SORT_COLUMNS = new Set([
  "id",
  "uuid",
  "formId",
  "formName",
  "formTeamId",
  "formUserId",
  "bookingUid",
  "bookingId",
  "bookingStatus",
  "bookingStatusOrder",
  "bookingCreatedAt",
  "bookingUserId",
  "bookingUserName",
  "bookingUserEmail",
  "bookingUserAvatarUrl",
  "bookingAssignmentReason",
  "bookingStartTime",
  "bookingEndTime",
  "eventTypeId",
  "eventTypeParentId",
  "eventTypeSchedulingType",
  "createdAt",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
]);

type GetConditionsOptions = {
  exclude?: {
    createdAt?: boolean;
    columnFilterIds?: string[];
  };
};

export class InsightsRoutingBaseService {
  private prisma: typeof readonlyPrisma;
  private options: InsightsRoutingServiceOptions | null;
  private filters: InsightsRoutingServiceFilterOptions;

  constructor({
    prisma,
    options,
    filters,
  }: {
    prisma: typeof readonlyPrisma;
    options: InsightsRoutingServicePublicOptions;
    filters: InsightsRoutingServiceFilterOptions;
  }) {
    this.prisma = prisma;

    const validation = insightsRoutingServiceOptionsSchema.safeParse(options);
    this.options = validation.success ? validation.data : null;

    this.filters = filters;
  }

  /**
   * Returns routing funnel data split by the given date ranges.
   * @param dateRanges Array of { startDate, endDate, formattedDate }
   */
  async getRoutingFunnelData(dateRanges: DateRange[]) {
    if (!dateRanges.length) return [];

    // Validate date formats
    for (const range of dateRanges) {
      if (isNaN(Date.parse(range.startDate)) || isNaN(Date.parse(range.endDate))) {
        throw new Error(`Invalid date format in range: ${range.startDate} - ${range.endDate}`);
      }
    }

    const baseConditions = await this.getBaseConditions();

    // Build the CASE statements for each date range with proper date casting
    const caseStatements = dateRanges
      .map(
        (dateRange) => Prisma.sql`
      WHEN "createdAt" >= ${dateRange.startDate}::timestamp AND "createdAt" <= ${dateRange.endDate}::timestamp THEN ${dateRange.formattedDate}
    `
      )
      .reduce((acc, curr) => Prisma.sql`${acc} ${curr}`);

    // Single query to get all data grouped by date ranges using CTE
    const results = await this.prisma.$queryRaw<
      Array<{
        dateRange: string | null;
        totalSubmissions: bigint;
        successfulRoutings: bigint;
        acceptedBookings: bigint;
      }>
    >`
      WITH date_ranged_data AS (
        SELECT
          CASE ${caseStatements}
          ELSE NULL
          END as "dateRange",
          "bookingUid",
          "bookingStatus"
        FROM "RoutingFormResponseDenormalized" rfrd
        WHERE ${baseConditions}
      )
      SELECT
        "dateRange",
        COUNT(*) as "totalSubmissions",
        COUNT(CASE WHEN "bookingUid" IS NOT NULL THEN 1 END) as "successfulRoutings",
        COUNT(CASE WHEN "bookingStatus" NOT IN ('cancelled', 'rejected') THEN 1 END) as "acceptedBookings"
      FROM date_ranged_data
      WHERE "dateRange" IS NOT NULL
      GROUP BY "dateRange"
      ORDER BY "dateRange"
    `;

    // Create a map of results by dateRange for easy lookup
    const resultsMap = new Map(
      results
        .filter((row): row is typeof row & { dateRange: string } => row.dateRange !== null)
        .map((row) => [
          row.dateRange,
          {
            name: row.dateRange,
            totalSubmissions: Number(row.totalSubmissions),
            successfulRoutings: Number(row.successfulRoutings),
            acceptedBookings: Number(row.acceptedBookings),
          },
        ])
    );

    // Return all date ranges, filling with 0 values for missing data
    return dateRanges.map((dateRange) => {
      const existingData = resultsMap.get(dateRange.formattedDate);
      const data = existingData || {
        name: dateRange.formattedDate,
        totalSubmissions: 0,
        successfulRoutings: 0,
        acceptedBookings: 0,
      };

      return {
        ...data,
        formattedDateFull: dateRange.formattedDateFull,
      };
    });
  }

  /**
   * Returns paginated table data for routing form responses.
   * @param sorting Array of sorting objects with id and desc properties
   * @param limit Number of records to return
   * @param offset Number of records to skip
   */
  async getTableData({
    sorting,
    limit,
    offset,
  }: {
    sorting?: Array<{ id: string; desc: boolean }>;
    limit: number;
    offset: number;
  }) {
    const baseConditions = await this.getBaseConditions();

    // Build ORDER BY clause
    const orderByClause = this.buildOrderByClause(sorting);

    // Get total count
    const totalCountResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM "RoutingFormResponseDenormalized" rfrd
      WHERE ${baseConditions}
    `;

    const totalCount = Number(totalCountResult[0]?.count || 0);

    // Get paginated data with JSON aggregation for attendees and fields
    const data = await this.prisma.$queryRaw<Array<InsightsRoutingTableItem>>`
      SELECT
        rfrd."id",
        rfrd."uuid",
        rfrd."formId",
        rfrd."formName",
        rfrd."formTeamId",
        rfrd."formUserId",
        rfrd."bookingUid",
        rfrd."bookingId",
        UPPER(rfrd."bookingStatus"::text) as "bookingStatus",
        rfrd."bookingStatusOrder",
        rfrd."bookingCreatedAt",
        rfrd."bookingUserId",
        rfrd."bookingUserName",
        rfrd."bookingUserEmail",
        rfrd."bookingUserAvatarUrl",
        rfrd."bookingAssignmentReason",
        rfrd."bookingStartTime",
        rfrd."bookingEndTime",
        rfrd."eventTypeId",
        rfrd."eventTypeParentId",
        rfrd."eventTypeSchedulingType",
        rfrd."createdAt",
        rfrd."utm_source",
        rfrd."utm_medium",
        rfrd."utm_campaign",
        rfrd."utm_term",
        rfrd."utm_content",
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'name', a."name",
                'timeZone', a."timeZone",
                'email', a."email",
                'phoneNumber', a."phoneNumber"
              )
            ) FILTER (WHERE a."id" IS NOT NULL),
            '[]'::json
          )
          FROM "Booking" b2
          LEFT JOIN "Attendee" a ON a."bookingId" = b2."id"
          WHERE b2."uid" = rfrd."bookingUid"
        ) as "bookingAttendees",
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'fieldId', f."fieldId",
                'valueString', f."valueString",
                'valueNumber', f."valueNumber",
                'valueStringArray', f."valueStringArray"
              )
            ) FILTER (WHERE f."fieldId" IS NOT NULL),
            '[]'::json
          )
          FROM "RoutingFormResponseField" f
          WHERE f."responseId" = rfrd."id"
        ) as "fields"
      FROM "RoutingFormResponseDenormalized" rfrd
      WHERE ${baseConditions}
      ${orderByClause}
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return {
      total: totalCount,
      data,
    };
  }

  async getRoutingFormStats() {
    const baseConditions = await this.getBaseConditions();

    // Check if bookingUid filter is applied - if so, return null as metrics don't provide value
    const bookingUid = this.filters.columnFilters?.find((filter) => filter.id === "bookingUid");
    if (bookingUid && isTextFilterValue(bookingUid.value) && bookingUid.value.data) {
      // If bookingUid filter is applied, total count should be either 0 or 1.
      // So this metrics doesn't provide any value.
      return null;
    }

    // Get total count
    const totalResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM "RoutingFormResponseDenormalized" rfrd
      WHERE ${baseConditions}
    `;

    // Get total without booking count
    const totalWithoutBookingResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM "RoutingFormResponseDenormalized" rfrd
      WHERE (${baseConditions}) AND ("bookingUid" IS NULL)
    `;

    const total = Number(totalResult[0]?.count || 0);
    const totalWithoutBooking = Number(totalWithoutBookingResult[0]?.count || 0);

    return {
      total,
      totalWithoutBooking,
      totalWithBooking: total - totalWithoutBooking,
    };
  }

  private buildOrderByClause(sorting?: Array<{ id: string; desc: boolean }>): Prisma.Sql {
    if (!sorting || sorting.length === 0) {
      return Prisma.sql`ORDER BY "createdAt" DESC`;
    }

    const orderByParts = sorting
      .filter((sort) => ALLOWED_SORT_COLUMNS.has(sort.id))
      .map((sort) => {
        const direction = sort.desc ? Prisma.sql`DESC` : Prisma.sql`ASC`;
        return Prisma.sql`"${Prisma.raw(sort.id)}" ${direction}`;
      });

    if (orderByParts.length === 0) {
      return Prisma.sql`ORDER BY "createdAt" DESC`;
    }

    return Prisma.sql`ORDER BY ${orderByParts.reduce((acc, part, index) => {
      if (index === 0) return part;
      return Prisma.sql`${acc}, ${part}`;
    })}`;
  }

  /**
   * Returns routed to per period data with pagination support.
   * @param period The period type (day, week, month)
   * @param limit Optional limit for results
   * @param searchQuery Optional search query for user names/emails
   */
  async getRoutedToPerPeriodData({
    period,
    limit = 10,
    searchQuery,
  }: {
    period: "perDay" | "perWeek" | "perMonth";
    limit?: number;
    searchQuery?: string;
  }) {
    const dayJsPeriodMap = {
      perDay: "day",
      perWeek: "week",
      perMonth: "month",
    } as const;

    const dayjsPeriod = dayJsPeriodMap[period];
    const startDate = dayjs(this.filters.startDate).startOf(dayjsPeriod).toDate();
    const endDate = dayjs(this.filters.endDate).endOf(dayjsPeriod).toDate();

    const baseConditions = await this.getBaseConditions({ exclude: { createdAt: true } });

    // Build search condition
    const searchCondition = searchQuery
      ? Prisma.sql`("bookingUserName" ILIKE ${`%${searchQuery}%`} OR "bookingUserEmail" ILIKE ${`%${searchQuery}%`})`
      : Prisma.sql`1 = 1`;

    // Get users who have been routed to during the period
    const usersQuery = await this.prisma.$queryRaw<
      Array<{
        id: number;
        name: string | null;
        email: string;
        avatarUrl: string | null;
      }>
    >`
      WITH routed_responses AS (
        SELECT DISTINCT ON ("bookingUserId")
          "bookingUserId",
          "bookingUserId" as id,
          "bookingUserName" as name,
          "bookingUserEmail" as email,
          "bookingUserAvatarUrl" as "avatarUrl"
        FROM "RoutingFormResponseDenormalized"
        WHERE "bookingUid" IS NOT NULL
        AND "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
        AND ${baseConditions}
        AND ${searchCondition}
        ORDER BY "bookingUserId", "createdAt" DESC
      )
      SELECT *
      FROM routed_responses
      ORDER BY id ASC
      LIMIT ${limit}
    `;

    const users = usersQuery;
    const hasMoreUsers = users.length === limit;

    // Return early if no users found
    if (users.length === 0) {
      return {
        users: {
          data: [],
          nextCursor: undefined,
        },
        periodStats: {
          data: [],
          nextCursor: undefined,
        },
      };
    }

    // Get periods with pagination
    const periodStats = await this.prisma.$queryRaw<
      Array<{
        userId: number;
        period_start: Date;
        total: number;
      }>
    >`
      WITH RECURSIVE date_range AS (
        SELECT date_trunc(${dayjsPeriod}, ${startDate}::timestamp) as date
        UNION ALL
        SELECT date + (CASE
          WHEN ${dayjsPeriod} = 'day' THEN interval '1 day'
          WHEN ${dayjsPeriod} = 'week' THEN interval '1 week'
          WHEN ${dayjsPeriod} = 'month' THEN interval '1 month'
        END)
        FROM date_range
        WHERE date < date_trunc(${dayjsPeriod}, ${endDate}::timestamp + interval '1 day')
      ),
      all_users AS (
        SELECT unnest(ARRAY[${Prisma.join(users.map((u) => u.id))}]) as user_id
      ),
      paginated_periods AS (
        SELECT date as period_start
        FROM date_range
        ORDER BY date ASC
        LIMIT ${limit}
      ),
      date_user_combinations AS (
        SELECT
          period_start,
          user_id as "userId"
        FROM paginated_periods
        CROSS JOIN all_users
      ),
      booking_counts AS (
        SELECT
          "bookingUserId",
          date_trunc(${dayjsPeriod}, "createdAt") as period_start,
          COUNT(DISTINCT "bookingId")::integer as total
        FROM "RoutingFormResponseDenormalized"
        WHERE "bookingUserId" IN (SELECT user_id FROM all_users)
        AND date_trunc(${dayjsPeriod}, "createdAt") >= (SELECT MIN(period_start) FROM paginated_periods)
        AND date_trunc(${dayjsPeriod}, "createdAt") <= (SELECT MAX(period_start) FROM paginated_periods)
        AND ${baseConditions}
        GROUP BY 1, 2
      )
      SELECT
        c."userId",
        c.period_start,
        COALESCE(b.total, 0)::integer as total
      FROM date_user_combinations c
      LEFT JOIN booking_counts b ON
        b."bookingUserId" = c."userId" AND
        b.period_start = c.period_start
      ORDER BY c.period_start ASC, c."userId" ASC
    `;

    // Get total number of periods to determine if there are more
    const totalPeriodsQuery = await this.prisma.$queryRaw<[{ count: number }]>`
      WITH RECURSIVE date_range AS (
        SELECT date_trunc(${dayjsPeriod}, ${startDate}::timestamp) as date
        UNION ALL
        SELECT date + (CASE
          WHEN ${dayjsPeriod} = 'day' THEN interval '1 day'
          WHEN ${dayjsPeriod} = 'week' THEN interval '1 week'
          WHEN ${dayjsPeriod} = 'month' THEN interval '1 month'
        END)
        FROM date_range
        WHERE date < date_trunc(${dayjsPeriod}, ${endDate}::timestamp + interval '1 day')
      )
      SELECT COUNT(*)::integer as count FROM date_range
    `;

    // Get statistics for the entire period for comparison
    const statsQuery = await this.prisma.$queryRaw<
      Array<{
        userId: number;
        total_bookings: number;
      }>
    >`
      SELECT
        "bookingUserId" as "userId",
        COUNT(*)::integer as total_bookings
      FROM "RoutingFormResponseDenormalized"
      WHERE "bookingUid" IS NOT NULL
      AND "createdAt" >= ${startDate}
      AND "createdAt" <= ${endDate}
      AND ${baseConditions}
      GROUP BY "bookingUserId"
      ORDER BY total_bookings ASC
    `;

    // Calculate average and median
    const average =
      statsQuery.reduce((sum, stat) => sum + Number(stat.total_bookings), 0) / statsQuery.length || 0;
    const median = statsQuery[Math.floor(statsQuery.length / 2)]?.total_bookings || 0;

    // Create a map of user performance indicators
    const userPerformance = statsQuery.reduce((acc, stat) => {
      acc[stat.userId] = {
        total: stat.total_bookings,
        performance:
          stat.total_bookings > average
            ? "above_average"
            : stat.total_bookings === median
            ? "median"
            : stat.total_bookings < average
            ? "below_average"
            : "at_average",
      };
      return acc;
    }, {} as Record<number, { total: number; performance: "above_average" | "at_average" | "below_average" | "median" }>);

    return {
      users: {
        data: users.map((user) => ({
          ...user,
          performance: userPerformance[user.id]?.performance || "no_data",
          totalBookings: userPerformance[user.id]?.total || 0,
        })),
      },
      periodStats: {
        data: periodStats,
      },
    };
  }

  /**
   * Returns routed to per period data for CSV export (no pagination).
   * @param period The period type (day, week, month)
   * @param searchQuery Optional search query for user names/emails
   */
  async getRoutedToPerPeriodCsvData({
    period,
    searchQuery,
  }: {
    period: "perDay" | "perWeek" | "perMonth";
    searchQuery?: string;
  }) {
    const dayJsPeriodMap = {
      perDay: "day",
      perWeek: "week",
      perMonth: "month",
    } as const;

    const dayjsPeriod = dayJsPeriodMap[period];
    const startDate = dayjs(this.filters.startDate).startOf(dayjsPeriod).toDate();
    const endDate = dayjs(this.filters.endDate).endOf(dayjsPeriod).toDate();

    const baseConditions = await this.getBaseConditions({ exclude: { createdAt: true } });

    // Build search condition
    const searchCondition = searchQuery
      ? Prisma.sql`("bookingUserName" ILIKE ${`%${searchQuery}%`} OR "bookingUserEmail" ILIKE ${`%${searchQuery}%`})`
      : Prisma.sql`1 = 1`;

    // Get users who have been routed to during the period
    const usersQuery = await this.prisma.$queryRaw<
      Array<{
        id: number;
        name: string | null;
        email: string;
        avatarUrl: string | null;
      }>
    >`
      WITH routed_responses AS (
        SELECT DISTINCT ON ("bookingUserId")
          "bookingUserId",
          "bookingUserId" as id,
          "bookingUserName" as name,
          "bookingUserEmail" as email,
          "bookingUserAvatarUrl" as "avatarUrl"
        FROM "RoutingFormResponseDenormalized"
        WHERE "bookingUid" IS NOT NULL
        AND "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
        AND ${baseConditions}
        AND ${searchCondition}
        ORDER BY "bookingUserId", "createdAt" DESC
      )
      SELECT *
      FROM routed_responses
      ORDER BY id ASC
    `;

    // Get all periods without pagination
    const periodStats = await this.prisma.$queryRaw<
      Array<{
        userId: number;
        period_start: Date;
        total: number;
      }>
    >`
      WITH RECURSIVE date_range AS (
        SELECT date_trunc(${dayjsPeriod}, ${startDate}::timestamp) as date
        UNION ALL
        SELECT date + (CASE
          WHEN ${dayjsPeriod} = 'day' THEN interval '1 day'
          WHEN ${dayjsPeriod} = 'week' THEN interval '1 week'
          WHEN ${dayjsPeriod} = 'month' THEN interval '1 month'
        END)
        FROM date_range
        WHERE date < date_trunc(${dayjsPeriod}, ${endDate}::timestamp + interval '1 day')
      ),
      all_users AS (
        SELECT unnest(ARRAY[${Prisma.join(usersQuery.map((u) => u.id))}]) as user_id
      ),
      date_user_combinations AS (
        SELECT
          date as period_start,
          user_id as "userId"
        FROM date_range
        CROSS JOIN all_users
      ),
      booking_counts AS (
        SELECT
          "bookingUserId",
          date_trunc(${dayjsPeriod}, "createdAt") as period_start,
          COUNT(DISTINCT "bookingId")::integer as total
        FROM "RoutingFormResponseDenormalized"
        WHERE "bookingUserId" IN (SELECT user_id FROM all_users)
        AND date_trunc(${dayjsPeriod}, "createdAt") >= (SELECT MIN(date) FROM date_range)
        AND date_trunc(${dayjsPeriod}, "createdAt") <= (SELECT MAX(date) FROM date_range)
        AND ${baseConditions}
        GROUP BY 1, 2
      )
      SELECT
        c."userId",
        c.period_start,
        COALESCE(b.total, 0)::integer as total
      FROM date_user_combinations c
      LEFT JOIN booking_counts b ON
        b."bookingUserId" = c."userId" AND
        b.period_start = c.period_start
      ORDER BY c.period_start ASC, c."userId" ASC
    `;

    // Get statistics for the entire period for comparison
    const statsQuery = await this.prisma.$queryRaw<
      Array<{
        userId: number;
        total_bookings: number;
      }>
    >`
      SELECT
        "bookingUserId" as "userId",
        COUNT(*)::integer as total_bookings
      FROM "RoutingFormResponseDenormalized"
      WHERE "bookingUid" IS NOT NULL
      AND "createdAt" >= ${startDate}
      AND "createdAt" <= ${endDate}
      AND ${baseConditions}
      GROUP BY "bookingUserId"
      ORDER BY total_bookings ASC
    `;

    // Calculate average and median
    const average =
      statsQuery.reduce((sum, stat) => sum + Number(stat.total_bookings), 0) / statsQuery.length || 0;
    const median = statsQuery[Math.floor(statsQuery.length / 2)]?.total_bookings || 0;

    // Create a map of user performance indicators
    const userPerformance = statsQuery.reduce((acc, stat) => {
      acc[stat.userId] = {
        total: stat.total_bookings,
        performance:
          stat.total_bookings > average
            ? "above_average"
            : stat.total_bookings === median
            ? "median"
            : stat.total_bookings < average
            ? "below_average"
            : "at_average",
      };
      return acc;
    }, {} as Record<number, { total: number; performance: "above_average" | "at_average" | "below_average" | "median" }>);

    // Group period stats by user
    const userPeriodStats = periodStats.reduce((acc, stat) => {
      if (!acc[stat.userId]) {
        acc[stat.userId] = [];
      }
      acc[stat.userId].push({
        period_start: stat.period_start,
        total: stat.total,
      });
      return acc;
    }, {} as Record<number, Array<{ period_start: Date; total: number }>>);

    // Format data for CSV
    return usersQuery.map((user) => {
      const stats = userPeriodStats[user.id] || [];
      const periodData = stats.reduce(
        (acc, stat) => ({
          ...acc,
          [`Responses ${dayjs(stat.period_start).format("YYYY-MM-DD")}`]: stat.total.toString(),
        }),
        {} as Record<string, string>
      );

      return {
        "User ID": user.id.toString(),
        Name: user.name || "",
        Email: user.email,
        "Total Bookings": (userPerformance[user.id]?.total || 0).toString(),
        Performance: userPerformance[user.id]?.performance || "no_data",
        ...periodData,
      };
    });
  }

  async getBaseConditions(conditionsOptions?: GetConditionsOptions): Promise<Prisma.Sql> {
    const authConditions = await this.getAuthorizationConditions();
    const filterConditions = await this.getFilterConditions(conditionsOptions);

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

  async getFilterConditions(conditionsOptions?: GetConditionsOptions): Promise<Prisma.Sql | null> {
    const conditions: Prisma.Sql[] = [];
    const exclude = (conditionsOptions || {}).exclude || {};

    // Date range filtering
    if (this.filters.startDate && this.filters.endDate && !exclude.createdAt) {
      conditions.push(
        Prisma.sql`"createdAt" >= ${this.filters.startDate}::timestamp AND "createdAt" <= ${this.filters.endDate}::timestamp`
      );
    }

    const columnFilters = (this.filters.columnFilters || []).filter(
      (filter) => !(exclude.columnFilterIds || []).includes(filter.id)
    );

    // Extract specific filters from columnFilters
    // Convert columnFilters array to object for easier access
    const filtersMap =
      columnFilters.reduce((acc, filter) => {
        acc[filter.id] = filter;
        return acc;
      }, {} as Record<string, TypedColumnFilter<ColumnFilterType>>) || {};

    // Extract booking status order filter
    const bookingStatusOrder = filtersMap["bookingStatusOrder"];
    if (bookingStatusOrder && isMultiSelectFilterValue(bookingStatusOrder.value)) {
      const statusCondition = makeSqlCondition(bookingStatusOrder.value);
      if (statusCondition) {
        conditions.push(Prisma.sql`"bookingStatusOrder" ${statusCondition}`);
      }
    }

    // Extract booking assignment reason filter
    const bookingAssignmentReason = filtersMap["bookingAssignmentReason"];
    if (bookingAssignmentReason && isTextFilterValue(bookingAssignmentReason.value)) {
      const reasonCondition = makeSqlCondition(bookingAssignmentReason.value);
      if (reasonCondition) {
        conditions.push(Prisma.sql`"bookingAssignmentReason" ${reasonCondition}`);
      }
    }

    // Extract booking UID filter
    const bookingUid = filtersMap["bookingUid"];
    if (bookingUid && isTextFilterValue(bookingUid.value)) {
      const uidCondition = makeSqlCondition(bookingUid.value);
      if (uidCondition) {
        conditions.push(Prisma.sql`"bookingUid" ${uidCondition}`);
      }
    }

    // Extract attendee name filter
    const attendeeName = filtersMap["attendeeName"];
    if (attendeeName && isTextFilterValue(attendeeName.value)) {
      const nameCondition = this.buildAttendeeSqlCondition(attendeeName.value, "name");
      if (nameCondition) {
        conditions.push(nameCondition);
      }
    }

    // Extract attendee email filter
    const attendeeEmail = filtersMap["attendeeEmail"];
    if (attendeeEmail && isTextFilterValue(attendeeEmail.value)) {
      const emailCondition = this.buildAttendeeSqlCondition(attendeeEmail.value, "email");
      if (emailCondition) {
        conditions.push(emailCondition);
      }
    }

    // Extract attendee phone filter
    const attendeePhone = filtersMap["attendeePhone"];
    if (attendeePhone && isTextFilterValue(attendeePhone.value)) {
      const phoneCondition = this.buildAttendeeSqlCondition(attendeePhone.value, "phone");
      if (phoneCondition) {
        conditions.push(phoneCondition);
      }
    }

    // Extract member user IDs filter (multi-select)
    const memberUserIds = filtersMap["bookingUserId"];
    if (memberUserIds && isMultiSelectFilterValue(memberUserIds.value)) {
      conditions.push(Prisma.sql`"bookingUserId" = ANY(${memberUserIds.value.data})`);
    }

    // Extract form ID filter (single-select)
    const formId = filtersMap["formId"];
    if (formId && isSingleSelectFilterValue(formId.value)) {
      const formIdCondition = makeSqlCondition(formId.value);
      if (formIdCondition) {
        conditions.push(Prisma.sql`"formId" ${formIdCondition}`);
      }
    }

    // Extract form field filters (exclude the system filters we already processed)
    const alreadyHandledFilters = [
      "bookingStatusOrder",
      "bookingAssignmentReason",
      "bookingUid",
      "attendeeName",
      "attendeeEmail",
      "attendeePhone",
      "bookingUserId",
      "formId",
    ];

    const fieldFilters = columnFilters.filter((filter) => !alreadyHandledFilters.includes(filter.id));

    if (fieldFilters.length > 0) {
      const fieldConditions = fieldFilters
        .map((fieldFilter) => this.buildFormFieldSqlCondition(fieldFilter.id, fieldFilter.value))
        .filter((condition): condition is Prisma.Sql => condition !== null);

      if (fieldConditions.length > 0) {
        // Join multiple field conditions with AND
        const joinedConditions = fieldConditions.reduce((acc, condition, index) => {
          if (index === 0) return condition;
          return Prisma.sql`(${acc}) AND (${condition})`;
        });
        conditions.push(joinedConditions);
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

  async getAuthorizationConditions(): Promise<Prisma.Sql> {
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
      return Prisma.sql`"formUserId" = ${this.options.userId} AND "formTeamId" IS NULL`;
    } else if (scope === "org") {
      return await this.buildOrgAuthorizationCondition(this.options);
    } else if (scope === "team") {
      return await this.buildTeamAuthorizationCondition(this.options);
    } else {
      return NOTHING_CONDITION;
    }
  }

  private async buildOrgAuthorizationCondition(
    options: Extract<InsightsRoutingServiceOptions, { scope: "org" }>
  ): Promise<Prisma.Sql> {
    // Get all teams from the organization
    const teamRepo = new TeamRepository(this.prisma);
    const teamsFromOrg = await teamRepo.findAllByParentId({
      parentId: options.orgId,
      select: { id: true },
    });

    const teamIds = [options.orgId, ...teamsFromOrg.map((t) => t.id)];

    return Prisma.sql`("formTeamId" = ANY(${teamIds})) OR ("formUserId" = ${options.userId} AND "formTeamId" IS NULL)`;
  }

  private async buildTeamAuthorizationCondition(
    options: Extract<InsightsRoutingServiceOptions, { scope: "team" }>
  ): Promise<Prisma.Sql> {
    const teamRepo = new TeamRepository(this.prisma);
    const childTeamOfOrg = await teamRepo.findByIdAndParentId({
      id: options.teamId,
      parentId: options.orgId,
      select: { id: true },
    });
    if (options.orgId && !childTeamOfOrg) {
      return NOTHING_CONDITION;
    }

    return Prisma.sql`"formTeamId" = ${options.teamId}`;
  }

  private async isOwnerOrAdmin(userId: number, targetId: number): Promise<boolean> {
    // Check if the user is an owner or admin of the organization or team
    const membership = await MembershipRepository.findUniqueByUserIdAndTeamId({ userId, teamId: targetId });
    return Boolean(
      membership &&
        membership.accepted &&
        membership.role &&
        (membership.role === MembershipRole.OWNER || membership.role === MembershipRole.ADMIN)
    );
  }

  private buildFormFieldSqlCondition(fieldId: string, filterValue: FilterValue): Prisma.Sql | null {
    if (isMultiSelectFilterValue(filterValue)) {
      // For multi-select fields, check if the field contains any of the selected values
      return Prisma.sql`EXISTS (
        SELECT 1 FROM "RoutingFormResponseField" rrf
        WHERE rrf."responseId" = rfrd."id"
        AND rrf."fieldId" = ${fieldId}
        AND rrf."valueStringArray" @> ${filterValue.data.map(String)}
      )`;
    } else if (isSingleSelectFilterValue(filterValue)) {
      return Prisma.sql`EXISTS (
        SELECT 1 FROM "RoutingFormResponseField" rrf
        WHERE rrf."responseId" = rfrd."id"
        AND rrf."fieldId" = ${fieldId}
        AND rrf."valueString" = ${filterValue.data}
      )`;
    } else if (isTextFilterValue(filterValue)) {
      const condition = makeSqlCondition(filterValue);
      if (!condition) {
        return null;
      }
      return Prisma.sql`EXISTS (
        SELECT 1 FROM "RoutingFormResponseField" rrf
        WHERE rrf."responseId" = rfrd."id"
        AND rrf."fieldId" = ${fieldId}
        AND rrf."valueString" ${condition}
      )`;
    } else if (isNumberFilterValue(filterValue)) {
      const condition = makeSqlCondition(filterValue);
      if (!condition) {
        return null;
      }
      return Prisma.sql`EXISTS (
        SELECT 1 FROM "RoutingFormResponseField" rrf
        WHERE rrf."responseId" = rfrd."id"
        AND rrf."fieldId" = ${fieldId}
        AND rrf."valueNumber" ${condition}
      )`;
    } else {
      return null;
    }
  }

  private buildAttendeeSqlCondition(
    filterValue: TextFilterValue,
    attendeeColumn: "name" | "email" | "phone"
  ): Prisma.Sql | null {
    if (!isTextFilterValue(filterValue)) {
      return null;
    }

    const textCondition = makeSqlCondition(filterValue);
    if (!textCondition) {
      return null;
    }

    // Use switch-case to avoid Prisma.raw for column names
    let columnCondition: Prisma.Sql;
    switch (attendeeColumn) {
      case "name":
        columnCondition = Prisma.sql`a.name ${textCondition}`;
        break;
      case "email":
        columnCondition = Prisma.sql`a.email ${textCondition}`;
        break;
      case "phone":
        columnCondition = Prisma.sql`a."phoneNumber" ${textCondition}`;
        break;
      default:
        return null;
    }

    return Prisma.sql`EXISTS (
      SELECT 1 FROM "Booking" b
      INNER JOIN "Attendee" a ON a."bookingId" = b."id"
      WHERE b."uid" = rfrd."bookingUid"
      AND ${columnCondition}
    )`;
  }
}
