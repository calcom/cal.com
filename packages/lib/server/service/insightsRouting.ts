import { Prisma } from "@prisma/client";
import { z } from "zod";

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
  orgId: number;
  teamId: number | undefined;
};

export type InsightsRoutingServiceOptions = z.infer<typeof insightsRoutingServiceOptionsSchema>;

export type InsightsRoutingServiceFilterOptions = {
  startDate?: string;
  endDate?: string;
  timeZone?: string;
};

const NOTHING_CONDITION = Prisma.sql`1=0`;

export class InsightsRoutingService {
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
  async getRoutingFunnelData(
    dateRanges: Array<{ startDate: string; endDate: string; formattedDate: string }>
  ) {
    if (!dateRanges.length) return [];

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
      return (
        existingData || {
          name: dateRange.formattedDate,
          totalSubmissions: 0,
          successfulRoutings: 0,
          acceptedBookings: 0,
        }
      );
    });
  }

  async getBaseConditions(): Promise<Prisma.Sql> {
    const authConditions = await this.getAuthorizationConditions();
    const filterConditions = await this.getFilterConditions();

    if (authConditions && filterConditions) {
      return Prisma.sql`(${authConditions}) AND (${filterConditions})`;
    } else if (authConditions) {
      return authConditions;
    } else if (filterConditions) {
      return filterConditions;
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
    if (!this.filters.startDate || !this.filters.endDate) {
      return NOTHING_CONDITION;
    }

    return Prisma.sql`"createdAt" >= ${this.filters.startDate}::timestamp AND "createdAt" <= ${this.filters.endDate}::timestamp`;
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
      return Prisma.sql`"formUserId" = ${this.options.userId}`;
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
    const teamsFromOrg = await TeamRepository.findAllByParentId({
      parentId: options.orgId,
      select: { id: true },
    });

    const teamIds = [options.orgId, ...teamsFromOrg.map((t) => t.id)];

    return Prisma.sql`"formTeamId" = ANY(${teamIds})`;
  }

  private async buildTeamAuthorizationCondition(
    options: Extract<InsightsRoutingServiceOptions, { scope: "team" }>
  ): Promise<Prisma.Sql> {
    const childTeamOfOrg = await TeamRepository.findByIdAndParentId({
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
}
