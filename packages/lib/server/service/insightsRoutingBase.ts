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
import type { DateRange } from "@calcom/features/insights/server/events";
import type { readonlyPrisma } from "@calcom/prisma";
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

const NOTHING_CONDITION = Prisma.sql`1=0`;

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
        FROM "RoutingFormResponseDenormalized"
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

    // Extract booking attendees filter
    const bookingAttendees = filtersMap["bookingAttendees"];
    if (bookingAttendees && isTextFilterValue(bookingAttendees.value)) {
      const attendeesCondition = this.buildAttendeeSqlCondition(bookingAttendees.value);
      if (attendeesCondition) {
        conditions.push(attendeesCondition);
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
      "bookingAttendees",
      "bookingUserId",
      "formId",
    ];

    const fieldFilters = (this.filters.columnFilters || []).filter(
      (filter) => !alreadyHandledFilters.includes(filter.id)
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
    const isOwnerOrAdmin = await this.isOrgOwnerOrAdmin(this.options.userId, this.options.orgId);
    if (!isOwnerOrAdmin) {
      return NOTHING_CONDITION;
    }

    if (this.options.scope === "user") {
      return Prisma.sql`"formUserId" = ${this.options.userId} AND "formTeamId" IS NULL`;
    } else if (this.options.scope === "org") {
      return await this.buildOrgAuthorizationCondition(this.options);
    } else if (this.options.scope === "team") {
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
    if (!childTeamOfOrg) {
      return NOTHING_CONDITION;
    }

    return Prisma.sql`"formTeamId" = ${options.teamId}`;
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

  private buildFormFieldSqlCondition(fieldId: string, filterValue: FilterValue): Prisma.Sql | null {
    if (isMultiSelectFilterValue(filterValue)) {
      // For multi-select fields, check if the field contains any of the selected values
      return Prisma.sql`EXISTS (
        SELECT 1 FROM "RoutingFormResponseField" rrf
        WHERE rrf."responseId" = "RoutingFormResponseDenormalized"."id"
        AND rrf."fieldId" = ${fieldId}
        AND rrf."valueStringArray" @> ${filterValue.data.map(String)}
      )`;
    } else if (isSingleSelectFilterValue(filterValue)) {
      return Prisma.sql`EXISTS (
        SELECT 1 FROM "RoutingFormResponseField" rrf
        WHERE rrf."responseId" = "RoutingFormResponseDenormalized"."id"
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
        WHERE rrf."responseId" = "RoutingFormResponseDenormalized"."id"
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
        WHERE rrf."responseId" = "RoutingFormResponseDenormalized"."id"
        AND rrf."fieldId" = ${fieldId}
        AND rrf."valueNumber" ${condition}
      )`;
    } else {
      return null;
    }
  }

  private buildAttendeeSqlCondition(filterValue: TextFilterValue): Prisma.Sql | null {
    if (!isTextFilterValue(filterValue)) {
      return null;
    }

    const textCondition = makeSqlCondition(filterValue);

    if (!textCondition) {
      return null;
    }

    const nameCondition = Prisma.sql`a.name ${textCondition}`;
    const emailCondition = Prisma.sql`a.email ${textCondition}`;

    const combinedCondition = Prisma.sql`(${nameCondition}) OR (${emailCondition})`;

    return Prisma.sql`EXISTS (
      SELECT 1 FROM "Booking" b
      INNER JOIN "Attendee" a ON a."bookingId" = b."id"
      WHERE b."uid" = "RoutingFormResponseDenormalized"."bookingUid"
      AND (${combinedCondition})
    )`;
  }
}
