import type { Prisma } from "@prisma/client";
import { z } from "zod";

import type { readonlyPrisma } from "@calcom/prisma";

export const insightsBookingRepositoryOptionsSchema = z.discriminatedUnion("scope", [
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

export type InsightsBookingRepositoryOptions = z.infer<typeof insightsBookingRepositoryOptionsSchema>;

export type InsightsBookingRepositoryFilterOptions = {
  eventTypeId?: number;
  memberUserId?: number;
};

const NOTHING = {
  id: -1,
} as const;

export class InsightsBookingRepository {
  private prisma: typeof readonlyPrisma;
  private options: InsightsBookingRepositoryOptions | null;
  private filters?: InsightsBookingRepositoryFilterOptions;
  private cachedAuthConditions?: Prisma.BookingTimeStatusDenormalizedWhereInput;
  private cachedFilterConditions?: Prisma.BookingTimeStatusDenormalizedWhereInput | null;

  constructor({
    prisma,
    options,
    filters,
  }: {
    prisma: typeof readonlyPrisma;
    options: InsightsBookingRepositoryOptions;
    filters?: InsightsBookingRepositoryFilterOptions;
  }) {
    this.prisma = prisma;

    const validation = insightsBookingRepositoryOptionsSchema.safeParse(options);
    this.options = validation.success ? validation.data : null;

    this.filters = filters;
  }

  async findMany(findManyArgs: Prisma.BookingTimeStatusDenormalizedFindManyArgs) {
    const authConditions = await this.getAuthorizationConditions();
    const filterConditions = await this.getFilterConditions();

    return this.prisma.bookingTimeStatusDenormalized.findMany({
      ...findManyArgs,
      where: {
        ...findManyArgs.where,
        AND: [authConditions, filterConditions].filter(
          (c): c is Prisma.BookingTimeStatusDenormalizedWhereInput => c !== null
        ),
      },
    });
  }

  async getAuthorizationConditions(): Promise<Prisma.BookingTimeStatusDenormalizedWhereInput> {
    if (this.cachedAuthConditions === undefined) {
      this.cachedAuthConditions = await this.buildAuthorizationConditions();
    }
    return this.cachedAuthConditions;
  }

  async getFilterConditions(): Promise<Prisma.BookingTimeStatusDenormalizedWhereInput | null> {
    if (this.cachedFilterConditions === undefined) {
      this.cachedFilterConditions = await this.buildFilterConditions();
    }
    return this.cachedFilterConditions;
  }

  async buildFilterConditions(): Promise<Prisma.BookingTimeStatusDenormalizedWhereInput | null> {
    const conditions: Prisma.BookingTimeStatusDenormalizedWhereInput[] = [];

    if (!this.filters) {
      return null;
    }

    if (this.filters.eventTypeId) {
      conditions.push({
        OR: [{ eventTypeId: this.filters.eventTypeId }, { eventParentId: this.filters.eventTypeId }],
      });
    }

    if (this.filters.memberUserId) {
      conditions.push({
        userId: this.filters.memberUserId,
      });
    }

    return conditions.length > 0 ? { AND: conditions } : null;
  }

  async buildAuthorizationConditions(): Promise<Prisma.BookingTimeStatusDenormalizedWhereInput> {
    if (!this.options) {
      return NOTHING;
    }
    const isOwnerOrAdmin = await this.isOrgOwnerOrAdmin(this.options.userId, this.options.orgId);
    if (!isOwnerOrAdmin) {
      return NOTHING;
    }

    const conditions: Prisma.BookingTimeStatusDenormalizedWhereInput[] = [];

    if (this.options.scope === "user") {
      conditions.push({
        userId: this.options.userId,
        teamId: null,
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
    options: Extract<InsightsBookingRepositoryOptions, { scope: "org" }>
  ): Promise<Prisma.BookingTimeStatusDenormalizedWhereInput> {
    // Get all teams from the organization
    const teamsFromOrg = await this.prisma.team.findMany({
      where: {
        parentId: options.orgId,
      },
      select: {
        id: true,
      },
    });
    const teamIds = [options.orgId, ...teamsFromOrg.map((t) => t.id)];

    // Get all users from the organization
    const userIdsFromOrg =
      teamsFromOrg.length > 0
        ? (
            await this.prisma.membership.findMany({
              where: {
                team: {
                  id: {
                    in: teamIds,
                  },
                },
                accepted: true,
              },
              select: {
                userId: true,
              },
            })
          ).map((m) => m.userId)
        : [];

    return {
      OR: [
        {
          teamId: {
            in: teamIds,
          },
          isTeamBooking: true,
        },
        ...(userIdsFromOrg.length > 0
          ? [
              {
                userId: {
                  in: Array.from(new Set(userIdsFromOrg)),
                },
                isTeamBooking: false,
              },
            ]
          : []),
      ],
    };
  }

  private async buildTeamAuthorizationCondition(
    options: Extract<InsightsBookingRepositoryOptions, { scope: "team" }>
  ): Promise<Prisma.BookingTimeStatusDenormalizedWhereInput> {
    const childTeamOfOrg = await this.prisma.team.findFirst({
      where: {
        id: options.teamId,
        parentId: options.orgId,
      },
    });
    if (!childTeamOfOrg) {
      return NOTHING;
    }

    const usersFromTeam = await this.prisma.membership.findMany({
      where: {
        teamId: options.teamId,
        accepted: true,
      },
      select: {
        userId: true,
      },
    });
    const userIdsFromTeam = usersFromTeam.map((u) => u.userId);

    return {
      OR: [
        {
          teamId: options.teamId,
          isTeamBooking: true,
        },
        {
          userId: {
            in: userIdsFromTeam,
          },
          isTeamBooking: false,
        },
      ],
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
