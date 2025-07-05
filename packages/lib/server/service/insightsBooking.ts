import type { Kysely, ExpressionBuilder } from "kysely";
import { z } from "zod";

import type { DB } from "@calcom/kysely";
import { MembershipRole } from "@calcom/kysely/types";

import { MembershipRepository } from "../repository/membership";
import { TeamRepository } from "../repository/team";

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

export type InsightsBookingServiceOptions = z.infer<typeof insightsBookingServiceOptionsSchema>;

export type InsightsBookingServiceFilterOptions = {
  eventTypeId?: number;
  memberUserId?: number;
};

const NOTHING = {
  id: -1,
} as const;

type WhereCondition = (
  eb: ExpressionBuilder<DB, "BookingTimeStatusDenormalized">
) => ReturnType<ExpressionBuilder<DB, "BookingTimeStatusDenormalized">["and"]>;

export class InsightsBookingService {
  private kysely: Kysely<DB>;
  private options: InsightsBookingServiceOptions | null;
  private filters?: InsightsBookingServiceFilterOptions;
  private baseWhereConditions?: WhereCondition[];

  constructor({
    kysely,
    options,
    filters,
  }: {
    kysely: Kysely<DB>;
    options: InsightsBookingServiceOptions;
    filters?: InsightsBookingServiceFilterOptions;
  }) {
    this.kysely = kysely;
    const validation = insightsBookingServiceOptionsSchema.safeParse(options);
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

  async buildFilterConditions(): Promise<WhereCondition | null> {
    if (!this.filters) {
      return null;
    }

    const conditions: WhereCondition[] = [];

    if (this.filters.eventTypeId) {
      const eventTypeId = this.filters.eventTypeId; // Create local reference
      conditions.push((eb) =>
        eb.or([eb("eventTypeId", "=", eventTypeId), eb("eventParentId", "=", eventTypeId)])
      );
    }

    if (this.filters.memberUserId) {
      const memberUserId = this.filters.memberUserId; // Create local reference
      conditions.push((eb) => eb("userId", "=", memberUserId));
    }

    return conditions.length > 0 ? (eb) => eb.and(conditions.map((condition) => condition(eb))) : null;
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
      conditions.push((eb) => eb.and([eb("userId", "=", options.userId), eb("teamId", "is", null)]));
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
    options: Extract<InsightsBookingServiceOptions, { scope: "org" }>
  ): Promise<WhereCondition> {
    // Get all teams from the organization
    const teamsFromOrg = await TeamRepository.findAllByParentId({
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

    return (eb) =>
      eb.or([
        eb.and([eb("teamId", "in", teamIds), eb("isTeamBooking", "=", true)]),
        ...(userIdsFromOrg.length > 0
          ? [
              eb.and([
                eb("userId", "in", Array.from(new Set(userIdsFromOrg))),
                eb("isTeamBooking", "=", false),
              ]),
            ]
          : []),
      ]);
  }

  private async buildTeamAuthorizationCondition(
    options: Extract<InsightsBookingServiceOptions, { scope: "team" }>
  ): Promise<WhereCondition> {
    const childTeamOfOrg = await TeamRepository.findByIdAndParentId({
      id: options.teamId,
      parentId: options.orgId,
      select: { id: true },
    });
    if (!childTeamOfOrg) {
      return (eb) => eb("id", "=", NOTHING.id);
    }

    const usersFromTeam = await MembershipRepository.findAllByTeamIds({
      teamIds: [options.teamId],
      select: { userId: true },
    });
    const userIdsFromTeam = usersFromTeam.map((u) => u.userId);

    return (eb) =>
      eb.or([
        eb.and([eb("teamId", "=", options.teamId), eb("isTeamBooking", "=", true)]),
        eb.and([eb("userId", "in", userIdsFromTeam), eb("isTeamBooking", "=", false)]),
      ]);
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

    let baseQuery = this.kysely.selectFrom("BookingTimeStatusDenormalized");

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
