import type { Prisma } from "@prisma/client";
import { z } from "zod";

import type { readonlyPrisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

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

export class InsightsBookingService {
  private prisma: typeof readonlyPrisma;
  private options: InsightsBookingServiceOptions | null;
  private filters?: InsightsBookingServiceFilterOptions;
  private cachedAuthConditions?: Prisma.BookingTimeStatusDenormalizedWhereInput;
  private cachedFilterConditions?: Prisma.BookingTimeStatusDenormalizedWhereInput | null;

  constructor({
    prisma,
    options,
    filters,
  }: {
    prisma: typeof readonlyPrisma;
    options: InsightsBookingServiceOptions;
    filters?: InsightsBookingServiceFilterOptions;
  }) {
    this.prisma = prisma;
    const validation = insightsBookingServiceOptionsSchema.safeParse(options);
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
    options: Extract<InsightsBookingServiceOptions, { scope: "org" }>
  ): Promise<Prisma.BookingTimeStatusDenormalizedWhereInput> {
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
    options: Extract<InsightsBookingServiceOptions, { scope: "team" }>
  ): Promise<Prisma.BookingTimeStatusDenormalizedWhereInput> {
    const childTeamOfOrg = await TeamRepository.findByIdAndParentId({
      id: options.teamId,
      parentId: options.orgId,
      select: { id: true },
    });
    if (!childTeamOfOrg) {
      return NOTHING;
    }

    const usersFromTeam = await MembershipRepository.findAllByTeamIds({
      teamIds: [options.teamId],
      select: { userId: true },
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
    const membership = await MembershipRepository.findUniqueByUserIdAndTeamId({ userId, teamId: orgId });
    return Boolean(
      membership &&
        membership.accepted &&
        membership.role &&
        ([MembershipRole.OWNER, MembershipRole.ADMIN] as const).includes(membership.role)
    );
  }
}
