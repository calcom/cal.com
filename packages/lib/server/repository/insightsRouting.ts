import type { Prisma } from "@prisma/client";
import { z } from "zod";

import type { readonlyPrisma } from "@calcom/prisma";

export const insightsRoutingRepositoryOptionsSchema = z.discriminatedUnion("scope", [
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

export type InsightsRoutingRepositoryOptions = z.infer<typeof insightsRoutingRepositoryOptionsSchema>;

export type InsightsRoutingRepositoryFilterOptions = {
  // Empty for now
};

const NOTHING = {
  id: -1,
} as const;

export class InsightsRoutingRepository {
  private prisma: typeof readonlyPrisma;
  private options: InsightsRoutingRepositoryOptions | null;
  private filters?: InsightsRoutingRepositoryFilterOptions;
  private cachedAuthConditions?: Prisma.RoutingFormResponseDenormalizedWhereInput;
  private cachedFilterConditions?: Prisma.RoutingFormResponseDenormalizedWhereInput | null;

  constructor({
    prisma,
    options,
    filters,
  }: {
    prisma: typeof readonlyPrisma;
    options: InsightsRoutingRepositoryOptions;
    filters?: InsightsRoutingRepositoryFilterOptions;
  }) {
    this.prisma = prisma;

    const validation = insightsRoutingRepositoryOptionsSchema.safeParse(options);
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
    options: Extract<InsightsRoutingRepositoryOptions, { scope: "org" }>
  ): Promise<Prisma.RoutingFormResponseDenormalizedWhereInput> {
    // Get all teams from the organization
    const teamsFromOrg = await this.prisma.team.findMany({
      where: {
        parentId: options.orgId,
      },
      select: {
        id: true,
      },
    });

    return {
      formTeamId: {
        in: [options.orgId, ...teamsFromOrg.map((t) => t.id)],
      },
    };
  }

  private async buildTeamAuthorizationCondition(
    options: Extract<InsightsRoutingRepositoryOptions, { scope: "team" }>
  ): Promise<Prisma.RoutingFormResponseDenormalizedWhereInput> {
    const childTeamOfOrg = await this.prisma.team.findFirst({
      where: {
        id: options.teamId,
        parentId: options.orgId,
      },
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
    const membershipOrg = await this.prisma.membership.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId: orgId,
        },
        accepted: true,
        role: {
          in: ["OWNER", "ADMIN"],
        },
      },
      select: {
        id: true,
      },
    });

    return Boolean(membershipOrg);
  }
}
