import { Prisma } from "@prisma/client";
import { z } from "zod";

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

export class InsightsRoutingBaseService {
  private prisma: typeof readonlyPrisma;
  private options: InsightsRoutingServiceOptions | null;
  private filters: InsightsRoutingServiceFilterOptions;
  private cachedAuthConditions?: Prisma.Sql;
  private cachedFilterConditions?: Prisma.Sql | null;

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

    // Date range filtering
    if (this.filters.startDate && this.filters.endDate) {
      conditions.push(
        Prisma.sql`"createdAt" >= ${this.filters.startDate}::timestamp AND "createdAt" <= ${this.filters.endDate}::timestamp`
      );
    }

    // Extract specific filters from columnFilters
    // Convert columnFilters array to object for easier access
    const filtersMap =
      this.filters.columnFilters?.reduce((acc, filter) => {
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

    const fieldIdSchema = z.string().uuid();
    const fieldFilters = (this.filters.columnFilters || []).filter(
      (filter) => fieldIdSchema.safeParse(filter.id).success
    );

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
