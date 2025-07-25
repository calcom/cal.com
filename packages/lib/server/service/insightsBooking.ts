import { Prisma } from "@prisma/client";
import { z } from "zod";

import type { readonlyPrisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { MembershipRepository } from "../repository/membership";
import { TeamRepository } from "../repository/team";

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

  async getBookingsByHourStats({ timeZone }: { timeZone: string }) {
    const baseConditions = await this.getBaseConditions();

    const results = await this.prisma.$queryRaw<
      Array<{
        hour: string;
        count: number;
      }>
    >`
      SELECT
        EXTRACT(HOUR FROM ("startTime" AT TIME ZONE 'UTC' AT TIME ZONE ${timeZone}))::int as "hour",
        COUNT(*)::int as "count"
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions}
        AND "status" = 'accepted'
      GROUP BY 1
      ORDER BY 1
    `;

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

    return await this.prisma.$queryRaw<Array<SelectedFields<TSelect>>>`
      SELECT ${selectFields}
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions}
    `;
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
        conditions.push(Prisma.sql`"${Prisma.raw(target)}" >= ${startDate}::timestamp`);
      }
      if (endDate) {
        if (isNaN(Date.parse(endDate))) {
          throw new Error(`Invalid date format: ${endDate}`);
        }
        conditions.push(Prisma.sql`"${Prisma.raw(target)}" <= ${endDate}::timestamp`);
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
