import type { Kysely, ExpressionBuilder } from "kysely";
import { z } from "zod";

import type { DB } from "@calcom/kysely";
import { MembershipRole } from "@calcom/kysely/types";

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

export type InsightsRoutingServiceOptions = z.infer<typeof insightsRoutingServiceOptionsSchema>;

export type InsightsRoutingServiceFilterOptions = {
  startDate: string;
  endDate: string;
};

const NOTHING = {
  id: -1,
} as const;

type WhereCondition = (
  eb: ExpressionBuilder<DB, "RoutingFormResponseDenormalized">
) => ReturnType<ExpressionBuilder<DB, "RoutingFormResponseDenormalized">["and"]>;

export class InsightsRoutingService {
  private kysely: Kysely<DB>;
  private options: InsightsRoutingServiceOptions | null;
  private filters?: InsightsRoutingServiceFilterOptions;
  private cachedAuthConditions?: WhereCondition;
  private cachedFilterConditions?: WhereCondition | null;

  constructor({
    kysely,
    options,
    filters,
  }: {
    kysely: Kysely<DB>;
    options: InsightsRoutingServiceOptions;
    filters?: InsightsRoutingServiceFilterOptions;
  }) {
    this.kysely = kysely;
    const validation = insightsRoutingServiceOptionsSchema.safeParse(options);
    this.options = validation.success ? validation.data : null;

    this.filters = filters;
  }

  async getDropOffData() {
    return await this.findMany({});
  }

  async findMany(findManyArgs: {
    select?: (keyof DB["RoutingFormResponseDenormalized"])[];
    where?: WhereCondition;
    orderBy?: Array<{ column: keyof DB["RoutingFormResponseDenormalized"]; direction: "asc" | "desc" }>;
    limit?: number;
    offset?: number;
  }) {
    const authConditions = await this.getAuthorizationConditions();
    const filterConditions = await this.getFilterConditions();

    let query = this.kysely.selectFrom("RoutingFormResponseDenormalized");

    // Apply select
    if (findManyArgs.select) {
      query = query.select(findManyArgs.select);
    } else {
      query = query.selectAll();
    }

    // Apply where conditions
    const whereConditions = [authConditions, filterConditions, findManyArgs.where].filter(
      (c): c is NonNullable<typeof c> => c !== null && c !== undefined
    );

    if (whereConditions.length > 0) {
      query = query.where((eb) => {
        if (whereConditions.length === 1) {
          return whereConditions[0](eb);
        }
        return eb.and(whereConditions.map((condition) => condition(eb)));
      });
    }

    // Apply orderBy
    if (findManyArgs.orderBy) {
      for (const order of findManyArgs.orderBy) {
        query = query.orderBy(order.column, order.direction);
      }
    }

    // Apply limit
    if (findManyArgs.limit) {
      query = query.limit(findManyArgs.limit);
    }

    // Apply offset
    if (findManyArgs.offset) {
      query = query.offset(findManyArgs.offset);
    }

    const compiled = query.compile();
    console.log("💡 compiled", compiled);

    return query.execute();
  }

  async getAuthorizationConditions(): Promise<WhereCondition> {
    if (this.cachedAuthConditions === undefined) {
      this.cachedAuthConditions = await this.buildAuthorizationConditions();
    }
    return this.cachedAuthConditions;
  }

  async getFilterConditions(): Promise<WhereCondition | null> {
    if (this.cachedFilterConditions === undefined) {
      this.cachedFilterConditions = await this.buildFilterConditions();
    }
    return this.cachedFilterConditions;
  }

  async buildFilterConditions(): Promise<WhereCondition | null> {
    const conditions: WhereCondition[] = [];

    if (this.filters?.startDate) {
      const startDate = this.filters.startDate;
      conditions.push((eb) => eb("createdAt", ">=", new Date(startDate)));
    }

    if (this.filters?.endDate) {
      const endDate = this.filters.endDate;
      conditions.push((eb) => eb("createdAt", "<=", new Date(endDate)));
    }

    if (conditions.length === 0) {
      return null;
    }

    return (eb) => eb.and(conditions.map((condition) => condition(eb)));
  }

  async buildAuthorizationConditions(): Promise<WhereCondition> {
    if (!this.options) {
      return (eb) => eb("id", "=", NOTHING.id);
    }
    const options = this.options; // Create a local reference to avoid undefined checks
    const isOwnerOrAdmin = await this.isOrgOwnerOrAdmin(options.userId, options.orgId);
    if (!isOwnerOrAdmin) {
      return (eb) => eb("id", "=", NOTHING.id);
    }

    const conditions: WhereCondition[] = [];

    if (options.scope === "user") {
      conditions.push((eb) => eb("formUserId", "=", options.userId));
    } else if (options.scope === "org") {
      conditions.push(await this.buildOrgAuthorizationCondition(options));
    } else if (options.scope === "team") {
      conditions.push(await this.buildTeamAuthorizationCondition(options));
    } else {
      return (eb) => eb("id", "=", NOTHING.id);
    }

    return (eb) => eb.and(conditions.map((condition) => condition(eb)));
  }

  private async buildOrgAuthorizationCondition(
    options: Extract<InsightsRoutingServiceOptions, { scope: "org" }>
  ): Promise<WhereCondition> {
    // Get all teams from the organization
    const teamsFromOrg = await TeamRepository.findAllByParentId({
      parentId: options.orgId,
      select: { id: true },
    });

    return (eb) => eb("formTeamId", "in", [options.orgId, ...teamsFromOrg.map((t) => t.id)]);
  }

  private async buildTeamAuthorizationCondition(
    options: Extract<InsightsRoutingServiceOptions, { scope: "team" }>
  ): Promise<WhereCondition> {
    const childTeamOfOrg = await TeamRepository.findByIdAndParentId({
      id: options.teamId,
      parentId: options.orgId,
      select: { id: true },
    });
    if (!childTeamOfOrg) {
      return (eb) => eb("id", "=", NOTHING.id);
    }

    return (eb) => eb("formTeamId", "=", options.teamId);
  }

  private async isOrgOwnerOrAdmin(userId: number, orgId: number): Promise<boolean> {
    // Check if the user is an owner or admin of the organization
    const membership = await MembershipRepository.findUniqueByUserIdAndTeamId({ userId, teamId: orgId });
    const allowedRoles: MembershipRole[] = [MembershipRole.OWNER, MembershipRole.ADMIN];
    return Boolean(
      membership && membership.accepted && membership.role && allowedRoles.includes(membership.role)
    );
  }
}
