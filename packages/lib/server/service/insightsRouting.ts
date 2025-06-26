import type { Prisma } from "@prisma/client";
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

export type InsightsRoutingServiceOptions = z.infer<typeof insightsRoutingServiceOptionsSchema>;

export type InsightsRoutingServiceFilterOptions = {
  // Empty for now
};

const NOTHING = {
  id: -1,
} as const;

export class InsightsRoutingService {
  private prisma: typeof readonlyPrisma;
  private options: InsightsRoutingServiceOptions | null;
  private filters?: InsightsRoutingServiceFilterOptions;
  private cachedAuthConditions?: Prisma.RoutingFormResponseDenormalizedWhereInput;
  private cachedFilterConditions?: Prisma.RoutingFormResponseDenormalizedWhereInput | null;

  constructor({
    prisma,
    options,
    filters,
  }: {
    prisma: typeof readonlyPrisma;
    options: InsightsRoutingServiceOptions;
    filters?: InsightsRoutingServiceFilterOptions;
  }) {
    this.prisma = prisma;

    const validation = insightsRoutingServiceOptionsSchema.safeParse(options);
    this.options = validation.success ? validation.data : null;

    this.filters = filters;
  }

  async findMany(findManyArgs: Prisma.RoutingFormResponseDenormalizedFindManyArgs) {
    const authConditions = await this.getAuthorizationConditions();
    const filterConditions = await this.getFilterConditions();

    return this.prisma.routingFormResponseDenormalized.findMany({
      ...findManyArgs,
      where: {
        ...findManyArgs.where,
        AND: [authConditions, filterConditions].filter(
          (c): c is Prisma.RoutingFormResponseDenormalizedWhereInput => c !== null && c !== undefined
        ),
      },
    });
  }

  async getAuthorizationConditions(): Promise<Prisma.RoutingFormResponseDenormalizedWhereInput> {
    if (this.cachedAuthConditions === undefined) {
      this.cachedAuthConditions = await this.buildAuthorizationConditions();
    }
    return this.cachedAuthConditions;
  }

  async getFilterConditions(): Promise<Prisma.RoutingFormResponseDenormalizedWhereInput | null> {
    if (this.cachedFilterConditions === undefined) {
      this.cachedFilterConditions = await this.buildFilterConditions();
    }
    return this.cachedFilterConditions;
  }

  async buildFilterConditions(): Promise<Prisma.RoutingFormResponseDenormalizedWhereInput | null> {
    // Empty for now
    return null;
  }

  async buildAuthorizationConditions(): Promise<Prisma.RoutingFormResponseDenormalizedWhereInput> {
    if (!this.options) {
      return NOTHING;
    }
    const isOwnerOrAdmin = await this.isOrgOwnerOrAdmin(this.options.userId, this.options.orgId);
    if (!isOwnerOrAdmin) {
      return NOTHING;
    }

    const conditions: Prisma.RoutingFormResponseDenormalizedWhereInput[] = [];

    if (this.options.scope === "user") {
      conditions.push({
        formUserId: this.options.userId,
      });
    } else if (this.options.scope === "org") {
      conditions.push(await this.buildOrgAuthorizationCondition(this.options));
    } else if (this.options.scope === "team") {
      conditions.push(await this.buildTeamAuthorizationCondition(this.options));
    } else {
      return NOTHING;
    }

    return {
      AND: conditions,
    };
  }

  private async buildOrgAuthorizationCondition(
    options: Extract<InsightsRoutingServiceOptions, { scope: "org" }>
  ): Promise<Prisma.RoutingFormResponseDenormalizedWhereInput> {
    // Get all teams from the organization
    const teamsFromOrg = await TeamRepository.findAllByParentId({
      parentId: options.orgId,
      select: { id: true },
    });

    return {
      formTeamId: {
        in: [options.orgId, ...teamsFromOrg.map((t) => t.id)],
      },
    };
  }

  private async buildTeamAuthorizationCondition(
    options: Extract<InsightsRoutingServiceOptions, { scope: "team" }>
  ): Promise<Prisma.RoutingFormResponseDenormalizedWhereInput> {
    const childTeamOfOrg = await TeamRepository.findByIdAndParentId({
      id: options.teamId,
      parentId: options.orgId,
      select: { id: true },
    });
    if (!childTeamOfOrg) {
      return NOTHING;
    }

    return {
      formTeamId: options.teamId,
    };
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
