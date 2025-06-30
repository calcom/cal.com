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
  private baseWhereConditions?: WhereCondition[];

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

  async init() {
    if (this.baseWhereConditions) {
      return;
    }

    const [authConditions, filterConditions] = await Promise.all([
      this.buildAuthorizationConditions(),
      this.buildFilterConditions(),
    ]);

    this.baseWhereConditions = [authConditions, filterConditions].filter(
      (c): c is NonNullable<typeof c> => c !== null && c !== undefined
    );
  }

  async getDropOffData() {
    const metrics = await this.query()
      .select((eb) => [
        eb.fn.count<number>("id").as("totalSubmissions"),
        eb.fn.count<number>(eb("bookingUid", "is not", null)).as("successfulRoutings"),
        eb.fn.count<number>(eb("bookingStatus", "=", "accepted")).as("acceptedBookings"),
        // eb.fn.count<number>(eb("bookingStatus", "=", "pending")).as("pendingBookings"),
        // eb.fn.count<number>(eb("bookingStatus", "=", "cancelled")).as("cancelledBookings"),
      ])
      .executeTakeFirst();

    if (!metrics) {
      return null;
    }

    const total = Number(metrics.totalSubmissions ?? 0);
    const successfulRoutings = Number(metrics.successfulRoutings ?? 0);
    const acceptedBookings = Number(metrics.acceptedBookings ?? 0);
    // const pendingBookings = Number(metrics.pendingBookings ?? 0);
    // const cancelledBookings = Number(metrics.cancelledBookings ?? 0);

    // Calculate rates (percentages)
    const routingRate = total > 0 ? (successfulRoutings / total) * 100 : 0;
    const acceptanceRate = total > 0 ? (acceptedBookings / total) * 100 : 0;

    return [
      {
        value: total,
        name: "Form Submissions",
        label: `${total} submissions`,
        rate: 100,
        fill: "#8884d8",
      },
      {
        value: successfulRoutings,
        name: "Successful Routing",
        label: `${successfulRoutings} routed (${routingRate.toFixed(1)}%)`,
        rate: routingRate,
        fill: "#83a6ed",
      },
      {
        value: acceptedBookings,
        name: "Accepted Bookings",
        label: `${acceptedBookings} accepted (${acceptanceRate.toFixed(1)}%)`,
        rate: acceptanceRate,
        fill: "#82ca9d",
      },
    ];
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

  query() {
    if (!this.baseWhereConditions) {
      throw new Error("Service must be initialized before building base query. Call init() first.");
    }

    let baseQuery = this.kysely.selectFrom("RoutingFormResponseDenormalized");

    if (this.baseWhereConditions.length > 0) {
      const baseWhereConditions = this.baseWhereConditions;

      baseQuery = baseQuery.where((eb) => {
        if (baseWhereConditions.length === 1) {
          return baseWhereConditions[0](eb);
        }
        return eb.and(baseWhereConditions.map((condition) => condition(eb)));
      });
    }

    return baseQuery;
  }
}
