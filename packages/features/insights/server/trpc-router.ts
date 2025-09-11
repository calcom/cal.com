import { z } from "zod";

import dayjs from "@calcom/dayjs";
import {
  insightsRoutingServiceInputSchema,
  insightsRoutingServicePaginatedInputSchema,
  routingRepositoryBaseInputSchema,
  routedToPerPeriodInputSchema,
  routedToPerPeriodCsvInputSchema,
  bookingRepositoryBaseInputSchema,
} from "@calcom/features/insights/server/raw-data.schema";
import { getInsightsBookingService } from "@calcom/lib/di/containers/InsightsBooking";
import { getInsightsRoutingService } from "@calcom/lib/di/containers/InsightsRouting";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import authedProcedure from "@calcom/trpc/server/procedures/authedProcedure";
import { router } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import { hasInsightsPermission } from "./hasInsightsPermission";
import { getTimeView, getDateRanges, type GetDateRangesParams } from "./insightsDateUtils";
import { RoutingEventsInsights } from "./routing-events";
import { VirtualQueuesInsights } from "./virtual-queues";

const UserBelongsToTeamInput = z.object({
  teamId: z.coerce.number().optional().nullable(),
  isAll: z.boolean().optional(),
});

type BuildBaseWhereConditionCtxType = {
  userIsOwnerAdminOfParentTeam: boolean;
  userOrganizationId: number | null;
  insightsDb: PrismaClient;
};

interface BuildBaseWhereConditionType {
  teamId?: number | null;
  eventTypeId?: number;
  memberUserId?: number;
  userId?: number;
  isAll?: boolean;
  ctx: BuildBaseWhereConditionCtxType;
}

export const buildBaseWhereCondition = async ({
  teamId,
  eventTypeId,
  memberUserId,
  userId,
  isAll,
  ctx,
}: BuildBaseWhereConditionType): Promise<{
  whereCondition: Prisma.BookingTimeStatusDenormalizedWhereInput;
}> => {
  const conditions: Prisma.BookingTimeStatusDenormalizedWhereInput[] = [];

  // EventType Filter
  if (eventTypeId) {
    conditions.push({
      OR: [{ eventTypeId }, { eventParentId: eventTypeId }],
    });
  }

  // User/Member filter
  if (memberUserId) {
    conditions.push({ userId: memberUserId });
  }

  if (userId) {
    conditions.push({
      teamId: null,
      userId: userId,
    });
  }

  // organization-wide queries condition
  if (isAll && ctx.userIsOwnerAdminOfParentTeam && ctx.userOrganizationId) {
    const teamsFromOrg = await ctx.insightsDb.team.findMany({
      where: {
        parentId: ctx.userOrganizationId,
      },
      select: {
        id: true,
      },
    });

    const teamIds = [ctx.userOrganizationId, ...teamsFromOrg.map((t) => t.id)];
    const usersFromOrg =
      teamsFromOrg.length > 0
        ? await ctx.insightsDb.membership.findMany({
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
        : [];

    conditions.push({
      OR: [
        {
          teamId: {
            in: teamIds,
          },
          isTeamBooking: true,
        },
        ...(usersFromOrg.length > 0
          ? [
              {
                userId: {
                  in: usersFromOrg.map((u) => u.userId),
                },
                isTeamBooking: false,
              },
            ]
          : []),
      ],
    });
  }

  // Team-specific queries condition
  if (!isAll && teamId) {
    const usersFromTeam = await ctx.insightsDb.membership.findMany({
      where: {
        teamId: teamId,
        accepted: true,
      },
      select: {
        userId: true,
      },
    });
    const userIdsFromTeam = usersFromTeam.map((u) => u.userId);

    conditions.push({
      OR: [
        {
          teamId,
          isTeamBooking: true,
        },
        {
          userId: {
            in: userIdsFromTeam,
          },
          isTeamBooking: false,
        },
      ],
    });
  }

  let whereCondition: Prisma.BookingTimeStatusDenormalizedWhereInput = {};

  if (conditions.length === 1) {
    whereCondition = conditions[0];
  } else if (conditions.length > 1) {
    whereCondition = { AND: conditions };
  }

  return {
    whereCondition:
      Object.keys(whereCondition).length === 0
        ? { id: -1 } // Ensure no data is returned for invalid parameters
        : whereCondition,
  };
};

const userBelongsToTeamProcedure = authedProcedure.use(async ({ ctx, next, getRawInput }) => {
  const parse = UserBelongsToTeamInput.safeParse(await getRawInput());
  if (!parse.success) {
    throw new TRPCError({ code: "BAD_REQUEST" });
  }

  // If teamId is provided, check if user belongs to team
  // If teamId is not provided, check if user belongs to any team

  const membershipWhereConditional: Prisma.MembershipWhereInput = {
    userId: ctx.user.id,
    accepted: true,
  };

  if (parse.data.teamId) {
    membershipWhereConditional["teamId"] = parse.data.teamId;
  }

  const membership = await ctx.insightsDb.membership.findFirst({
    where: membershipWhereConditional,
  });

  let isOwnerAdminOfParentTeam = false;

  // Probably we couldn't find a membership because the user is not a direct member of the team
  // So that would mean ctx.user.organization is present
  if ((parse.data.isAll && ctx.user.organizationId) || (!membership && ctx.user.organizationId)) {
    //Look for membership type in organizationId
    if (!membership && ctx.user.organizationId && parse.data.teamId) {
      const isChildTeamOfOrg = await ctx.insightsDb.team.findFirst({
        where: {
          id: parse.data.teamId,
          parentId: ctx.user.organizationId,
        },
      });
      if (!isChildTeamOfOrg) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
    }

    const membershipOrg = await ctx.insightsDb.membership.findFirst({
      where: {
        userId: ctx.user.id,
        teamId: ctx.user.organizationId,
        accepted: true,
        role: {
          in: ["OWNER", "ADMIN"],
        },
      },
    });
    if (!membershipOrg) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    isOwnerAdminOfParentTeam = true;
  }

  return next({
    ctx: {
      user: {
        ...ctx.user,
        isOwnerAdminOfParentTeam,
      },
    },
  });
});

const insightsPbacProcedure = userBelongsToTeamProcedure.use(async ({ ctx, next }) => {
  const hasPermission = await hasInsightsPermission({
    userId: ctx.user.id,
    organizationId: ctx.user.organizationId,
  });

  if (!hasPermission) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx,
  });
});

const userSelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  avatarUrl: true,
};

const emptyResponseBookingKPIStats = {
  empty: true,
  created: {
    count: 0,
    deltaPrevious: 0,
  },
  completed: {
    count: 0,
    deltaPrevious: 0,
  },
  rescheduled: {
    count: 0,
    deltaPrevious: 0,
  },
  cancelled: {
    count: 0,
    deltaPrevious: 0,
  },
  rating: {
    count: 0,
    deltaPrevious: 0,
  },
  no_show: {
    count: 0,
    deltaPrevious: 0,
  },
  no_show_guest: {
    count: 0,
    deltaPrevious: 0,
  },
  csat: {
    count: 0,
    deltaPrevious: 0,
  },
  previousRange: {
    startDate: dayjs().toISOString(),
    endDate: dayjs().toISOString(),
  },
};

export interface IResultTeamList {
  id: number;
  slug: string | null;
  name: string | null;
  logoUrl: string | null;
  userId?: number;
  isOrg?: boolean;
}

/**
 * Helper function to create InsightsBookingService with standardized parameters
 */
function createInsightsBookingService(
  ctx: { user: { id: number; organizationId: number | null } },
  input: z.infer<typeof bookingRepositoryBaseInputSchema>,
  dateTarget: "createdAt" | "startTime" = "createdAt"
) {
  const { scope, selectedTeamId, startDate, endDate, columnFilters } = input;
  return getInsightsBookingService({
    options: {
      scope,
      userId: ctx.user.id,
      orgId: ctx.user.organizationId ?? 0,
      ...(selectedTeamId && { teamId: selectedTeamId }),
    },
    filters: {
      ...(columnFilters && { columnFilters }),
      dateRange: {
        target: dateTarget,
        startDate,
        endDate,
      },
    },
  });
}

function createInsightsRoutingService(
  ctx: { insightsDb: PrismaClient; user: { id: number; organizationId: number | null } },
  input: z.infer<typeof routingRepositoryBaseInputSchema>
) {
  return getInsightsRoutingService({
    options: {
      scope: input.scope,
      teamId: input.selectedTeamId,
      userId: ctx.user.id,
      orgId: ctx.user.organizationId,
    },
    filters: {
      startDate: input.startDate,
      endDate: input.endDate,
      columnFilters: input.columnFilters,
    },
  });
}

export const insightsRouter = router({
  bookingKPIStats: insightsPbacProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const currentPeriodService = createInsightsBookingService(ctx, input);

      // Get current period stats
      const currentStats = await currentPeriodService.getBookingStats();

      // Calculate previous period dates and create service for previous period
      const previousPeriodDates = currentPeriodService.calculatePreviousPeriodDates();
      const previousPeriodService = createInsightsBookingService(ctx, {
        ...input,
        startDate: previousPeriodDates.startDate,
        endDate: previousPeriodDates.endDate,
      });

      // Get previous period stats
      const previousStats = await previousPeriodService.getBookingStats();

      // Helper function to calculate percentage change
      const getPercentage = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      // Calculate percentages and CSAT
      const currentCSAT =
        currentStats.total_ratings > 0
          ? (currentStats.ratings_above_3 / currentStats.total_ratings) * 100
          : 0;
      const previousCSAT =
        previousStats.total_ratings > 0
          ? (previousStats.ratings_above_3 / previousStats.total_ratings) * 100
          : 0;

      const currentRating = currentStats.avg_rating ? parseFloat(currentStats.avg_rating.toFixed(1)) : 0;
      const previousRating = previousStats.avg_rating ? parseFloat(previousStats.avg_rating.toFixed(1)) : 0;

      // Check if all metrics are zero for empty state
      const isEmpty =
        currentStats.total_bookings === 0 &&
        currentStats.completed_bookings === 0 &&
        currentStats.rescheduled_bookings === 0 &&
        currentStats.cancelled_bookings === 0 &&
        currentStats.no_show_host_bookings === 0 &&
        currentStats.no_show_guests === 0 &&
        currentRating === 0;

      if (isEmpty) {
        return emptyResponseBookingKPIStats;
      }

      return {
        empty: false,
        created: {
          count: currentStats.total_bookings,
          deltaPrevious: getPercentage(currentStats.total_bookings, previousStats.total_bookings),
        },
        completed: {
          count: currentStats.completed_bookings,
          deltaPrevious: getPercentage(
            currentStats.total_bookings - currentStats.cancelled_bookings - currentStats.rescheduled_bookings,
            previousStats.total_bookings -
              previousStats.cancelled_bookings -
              previousStats.rescheduled_bookings
          ),
        },
        rescheduled: {
          count: currentStats.rescheduled_bookings,
          deltaPrevious: getPercentage(currentStats.rescheduled_bookings, previousStats.rescheduled_bookings),
        },
        cancelled: {
          count: currentStats.cancelled_bookings,
          deltaPrevious: getPercentage(currentStats.cancelled_bookings, previousStats.cancelled_bookings),
        },
        no_show: {
          count: currentStats.no_show_host_bookings,
          deltaPrevious: getPercentage(
            currentStats.no_show_host_bookings,
            previousStats.no_show_host_bookings
          ),
        },
        no_show_guest: {
          count: currentStats.no_show_guests,
          deltaPrevious: getPercentage(currentStats.no_show_guests, previousStats.no_show_guests),
        },
        rating: {
          count: currentRating,
          deltaPrevious: getPercentage(currentRating, previousRating),
        },
        csat: {
          count: currentCSAT,
          deltaPrevious: getPercentage(currentCSAT, previousCSAT),
        },
        previousRange: {
          startDate: previousPeriodDates.formattedStartDate,
          endDate: previousPeriodDates.formattedEndDate,
        },
      };
    }),
  eventTrends: insightsPbacProcedure.input(bookingRepositoryBaseInputSchema).query(async ({ ctx, input }) => {
    const { startDate, endDate, timeZone } = input;

    // Calculate timeView and dateRanges
    const timeView = getTimeView(startDate, endDate);
    const dateRanges = getDateRanges({
      startDate,
      endDate,
      timeView,
      timeZone,
      weekStart: ctx.user.weekStart,
    });

    const insightsBookingService = createInsightsBookingService(ctx, input);
    try {
      return await insightsBookingService.getEventTrendsStats({
        timeZone,
        dateRanges,
      });
    } catch (e) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  }),
  popularEvents: insightsPbacProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ input, ctx }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input);

      try {
        return await insightsBookingService.getPopularEventsStats();
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  averageEventDuration: insightsPbacProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const { startDate, endDate, timeZone } = input;

      const insightsBookingService = createInsightsBookingService(ctx, input);

      try {
        const timeView = getTimeView(startDate, endDate);
        const dateRanges = getDateRanges({
          startDate,
          endDate,
          timeView,
          timeZone,
          weekStart: ctx.user.weekStart as GetDateRangesParams["weekStart"],
        });

        if (!dateRanges.length) {
          return [];
        }

        const startOfEndOf = timeView === "year" ? "year" : timeView === "month" ? "month" : "week";

        const allBookings = await insightsBookingService.findAll({
          select: {
            eventLength: true,
            createdAt: true,
          },
        });

        const resultMap = new Map<string, { totalDuration: number; count: number }>();

        // Initialize the map with all date ranges
        for (const range of dateRanges) {
          resultMap.set(dayjs(range.startDate).format("ll"), { totalDuration: 0, count: 0 });
        }

        for (const booking of allBookings) {
          const periodStart = dayjs(booking.createdAt).startOf(startOfEndOf).format("ll");
          if (resultMap.has(periodStart)) {
            const current = resultMap.get(periodStart);
            if (!current) continue;
            current.totalDuration += booking.eventLength || 0;
            current.count += 1;
          }
        }

        const result = Array.from(resultMap.entries()).map(([date, { totalDuration, count }]) => ({
          Date: date,
          Average: count > 0 ? totalDuration / count : 0,
        }));

        return result;
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  membersWithMostCancelledBookings: insightsPbacProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ input, ctx }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input);

      try {
        return await insightsBookingService.getMembersStatsWithCount("cancelled", "DESC");
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  membersWithMostCompletedBookings: insightsPbacProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ input, ctx }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input, "startTime");

      try {
        return await insightsBookingService.getMembersStatsWithCount("accepted", "DESC");
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  membersWithLeastCompletedBookings: insightsPbacProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ input, ctx }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input, "startTime");

      try {
        return await insightsBookingService.getMembersStatsWithCount("accepted", "ASC");
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  membersWithMostBookings: insightsPbacProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ input, ctx }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input);

      try {
        return await insightsBookingService.getMembersStatsWithCount("all", "DESC");
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  membersWithLeastBookings: insightsPbacProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ input, ctx }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input);

      try {
        return await insightsBookingService.getMembersStatsWithCount("all", "ASC");
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  teamListForUser: authedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;

    // Fetch user data
    const userData = await ctx.insightsDb.user.findUnique({
      where: {
        id: user.id,
      },
      select: userSelect,
    });

    if (!userData) {
      return [];
    }

    // Validate if user belongs to org as admin/owner
    if (user.organizationId && user.organization.isOrgAdmin) {
      const teamsAndOrg = await ctx.insightsDb.team.findMany({
        where: {
          OR: [{ parentId: user.organizationId }, { id: user.organizationId }],
        },
        select: {
          id: true,
          slug: true,
          name: true,
          logoUrl: true,
        },
      });
      const teamsFromOrg = teamsAndOrg.filter((team) => team.id !== user.organizationId);
      const orgTeam = teamsAndOrg.find((team) => team.id === user.organizationId);
      if (!orgTeam) {
        return [];
      }

      const result: IResultTeamList[] = [
        {
          ...orgTeam,
          isOrg: true,
        },
        ...teamsFromOrg,
      ];

      return result;
    }

    // Look if user it's admin/owner in multiple teams
    const belongsToTeams = await ctx.insightsDb.membership.findMany({
      where: {
        team: {
          slug: { not: null },
        },
        accepted: true,
        userId: user.id,
        OR: [
          {
            role: "ADMIN",
          },
          {
            role: "OWNER",
          },
        ],
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            slug: true,
            metadata: true,
          },
        },
      },
    });

    if (belongsToTeams.length === 0) {
      return [];
    }

    const result: IResultTeamList[] = belongsToTeams.map((membership) => {
      return { ...membership.team };
    });

    return result;
  }),
  userList: authedProcedure
    .input(
      z.object({
        teamId: z.number().optional(),
        isAll: z.boolean().nullable(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.user;
      const { teamId, isAll } = input;

      if (isAll && user.organizationId && user.organization.isOrgAdmin) {
        const usersInTeam = await ctx.insightsDb.membership.findMany({
          where: {
            team: {
              parentId: user.organizationId,
            },
          },
          include: {
            user: {
              select: userSelect,
            },
          },
          distinct: ["userId"],
        });
        return usersInTeam.map((membership) => membership.user);
      }

      if (!teamId) {
        return [];
      }

      const membership = await ctx.insightsDb.membership.findFirst({
        where: {
          userId: user.id,
          teamId,
          accepted: true,
        },
        include: {
          user: {
            select: userSelect,
          },
        },
      });
      if (!membership) {
        return [];
      }
      const isMember = membership && membership.role === "MEMBER";
      // If user is not admin, return himself only
      if (isMember) {
        return [membership.user];
      }

      const usersInTeam = await ctx.insightsDb.membership.findMany({
        where: {
          teamId,
          accepted: true,
        },
        include: {
          user: {
            select: userSelect,
          },
        },
        distinct: ["userId"],
      });

      return usersInTeam.map((membership) => membership.user);
    }),
  eventTypeList: insightsPbacProcedure
    .input(
      z.object({
        teamId: z.coerce.number().nullish(),
        userId: z.coerce.number().nullish(),
        isAll: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { prisma, user } = ctx;
      const { teamId, userId, isAll } = input;

      const eventTypeList = await getEventTypeList({
        prisma,
        teamId,
        userId,
        isAll,
        user: {
          id: user.id,
          organizationId: user.organizationId,
          isOwnerAdminOfParentTeam: user.isOwnerAdminOfParentTeam,
        },
      });

      return eventTypeList;
    }),
  recentRatings: insightsPbacProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input);
      return await insightsBookingService.getRecentRatingsStats();
    }),
  membersWithMostNoShow: insightsPbacProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ input, ctx }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input);

      try {
        return await insightsBookingService.getMembersStatsWithCount("noShow", "DESC");
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  membersWithHighestRatings: insightsPbacProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input);
      return await insightsBookingService.getMembersRatingStats("DESC");
    }),
  membersWithLowestRatings: insightsPbacProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input);
      return await insightsBookingService.getMembersRatingStats("ASC");
    }),
  rawData: insightsPbacProcedure
    .input(
      bookingRepositoryBaseInputSchema.extend({
        limit: z.number().max(100).optional(),
        offset: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, offset } = input;

      const insightsBookingService = createInsightsBookingService(ctx, input);

      try {
        return await insightsBookingService.getCsvData({
          limit: limit ?? 100,
          offset: offset ?? 0,
        });
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  getRoutingFormsForFilters: insightsPbacProcedure
    .input(z.object({ userId: z.number().optional(), teamId: z.number().optional(), isAll: z.boolean() }))
    .query(async ({ ctx, input }) => {
      const { teamId, isAll } = input;
      return await RoutingEventsInsights.getRoutingFormsForFilters({
        userId: ctx.user.id,
        teamId,
        isAll,
        organizationId: ctx.user.organizationId ?? undefined,
      });
    }),
  routingFormsByStatus: insightsPbacProcedure
    .input(insightsRoutingServiceInputSchema)
    .query(async ({ ctx, input }) => {
      const insightsRoutingService = createInsightsRoutingService(ctx, input);
      return await insightsRoutingService.getRoutingFormStats();
    }),
  routingFormResponses: insightsPbacProcedure
    .input(insightsRoutingServicePaginatedInputSchema)
    .query(async ({ ctx, input }) => {
      const insightsRoutingService = createInsightsRoutingService(ctx, input);
      return await insightsRoutingService.getTableData({
        sorting: input.sorting,
        limit: input.limit,
        offset: input.offset,
      });
    }),
  routingFormResponsesForDownload: insightsPbacProcedure
    .input(insightsRoutingServicePaginatedInputSchema)
    .query(async ({ ctx, input }) => {
      const headersPromise = RoutingEventsInsights.getRoutingFormHeaders({
        userId: ctx.user.id,
        teamId: input.selectedTeamId,
        isAll: input.scope === "org",
        organizationId: ctx.user.organizationId,
        routingFormId: (input.columnFilters || []).find((filter) => filter.id === "formId")?.value?.data as
          | string
          | undefined,
      });

      const insightsRoutingService = createInsightsRoutingService(ctx, input);
      const dataPromise = insightsRoutingService.getTableData({
        sorting: input.sorting,
        limit: input.limit,
        offset: input.offset,
      });

      return await RoutingEventsInsights.getRoutingFormPaginatedResponsesForDownload({
        headersPromise,
        dataPromise,
      });
    }),
  getRoutingFormFieldOptions: insightsPbacProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        teamId: z.number().optional(),
        isAll: z.boolean(),
        routingFormId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const options = await RoutingEventsInsights.getRoutingFormFieldOptions({
        ...input,
        userId: ctx.user.id,
        organizationId: ctx.user.organizationId ?? null,
      });
      return options;
    }),
  failedBookingsByField: insightsPbacProcedure
    .input(insightsRoutingServiceInputSchema)
    .query(async ({ ctx, input }) => {
      const insightsRoutingService = createInsightsRoutingService(ctx, input);
      try {
        return await insightsRoutingService.getFailedBookingsByFieldData();
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  routingFormResponsesHeaders: insightsPbacProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        teamId: z.number().optional(),
        isAll: z.boolean(),
        routingFormId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const headers = await RoutingEventsInsights.getRoutingFormHeaders({
        userId: ctx.user.id,
        teamId: input.teamId ?? null,
        isAll: input.isAll,
        organizationId: ctx.user.organizationId ?? null,
        routingFormId: input.routingFormId ?? null,
      });

      return headers || [];
    }),
  routedToPerPeriod: insightsPbacProcedure
    .input(routedToPerPeriodInputSchema)
    .query(async ({ ctx, input }) => {
      const { period, limit, searchQuery, ...rest } = input;

      try {
        const insightsRoutingService = createInsightsRoutingService(ctx, rest);
        return await insightsRoutingService.getRoutedToPerPeriodData({
          period,
          limit,
          searchQuery,
        });
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  routedToPerPeriodCsv: insightsPbacProcedure
    .input(routedToPerPeriodCsvInputSchema)
    .query(async ({ ctx, input }) => {
      const { period, searchQuery, ...rest } = input;
      try {
        const insightsRoutingService = createInsightsRoutingService(ctx, rest);

        const csvData = await insightsRoutingService.getRoutedToPerPeriodCsvData({
          period,
          searchQuery,
        });

        const csvString = objectToCsv(csvData);
        const downloadAs = `routed-to-${period}-${dayjs(rest.startDate).format("YYYY-MM-DD")}-${dayjs(
          rest.endDate
        ).format("YYYY-MM-DD")}.csv`;

        return { data: csvString, filename: downloadAs };
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  getUserRelevantTeamRoutingForms: authedProcedure.query(async ({ ctx }) => {
    try {
      const routingForms = await VirtualQueuesInsights.getUserRelevantTeamRoutingForms({
        userId: ctx.user.id,
      });

      return routingForms;
    } catch (e) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  }),
  getRoutingFunnelData: insightsPbacProcedure
    .input(routingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const timeView = getTimeView(input.startDate, input.endDate);
      const dateRanges = getDateRanges({
        startDate: input.startDate,
        endDate: input.endDate,
        timeZone: ctx.user.timeZone,
        timeView,
        weekStart: ctx.user.weekStart,
      });
      const insightsRoutingService = createInsightsRoutingService(ctx, input);
      try {
        return await insightsRoutingService.getRoutingFunnelData(dateRanges);
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  bookingsByHourStats: insightsPbacProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const { timeZone } = input;
      const insightsBookingService = createInsightsBookingService(ctx, input, "startTime");

      try {
        return await insightsBookingService.getBookingsByHourStats({
          timeZone,
        });
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  recentNoShowGuests: insightsPbacProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input, "startTime");

      try {
        return await insightsBookingService.getRecentNoShowGuests();
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
});

export async function getEventTypeList({
  prisma,
  teamId,
  userId,
  isAll,
  user,
}: {
  prisma: PrismaClient;
  teamId: number | null | undefined;
  userId: number | null | undefined;
  isAll: boolean | undefined;
  user: {
    id: number;
    organizationId: number | null;
    isOwnerAdminOfParentTeam: boolean;
  };
}) {
  if (!teamId && !userId && !isAll) {
    return [];
  }

  const membershipWhereConditional: Prisma.MembershipWhereInput = {};
  let childrenTeamIds: number[] = [];

  if (userId && !teamId && !isAll) {
    const eventTypeResult = await prisma.eventType.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        teamId: true,
        userId: true,
        team: {
          select: {
            name: true,
          },
        },
      },
      where: {
        userId: user.id,
        teamId: null,
      },
    });

    return eventTypeResult;
  }

  if (isAll && user.organizationId && user.isOwnerAdminOfParentTeam) {
    const childTeams = await prisma.team.findMany({
      where: {
        parentId: user.organizationId,
      },
      select: {
        id: true,
      },
    });

    if (childTeams.length > 0) {
      childrenTeamIds = childTeams.map((team) => team.id);
    }

    const eventTypeResult = await prisma.eventType.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        teamId: true,
        userId: true,
        team: {
          select: {
            name: true,
          },
        },
      },
      where: {
        OR: [
          {
            teamId: {
              in: [user.organizationId, ...childrenTeamIds],
            },
          },
          {
            userId: user.id,
            teamId: null,
          },
        ],
      },
    });

    return eventTypeResult;
  }

  if (teamId && !isAll) {
    membershipWhereConditional["teamId"] = teamId;
    membershipWhereConditional["userId"] = user.id;
  }

  // I'm not using unique here since when userId comes from input we should look for every
  // event type that user owns
  const membership = await prisma.membership.findFirst({
    where: membershipWhereConditional,
  });

  if (!membership && !user.isOwnerAdminOfParentTeam) {
    throw new Error("User is not part of a team/org");
  }

  const eventTypeWhereConditional: Prisma.EventTypeWhereInput = {};

  if (teamId && !isAll) {
    eventTypeWhereConditional["teamId"] = teamId;
  }

  let isMember = membership?.role === "MEMBER";
  if (user.isOwnerAdminOfParentTeam) {
    isMember = false;
  }

  if (isMember) {
    eventTypeWhereConditional["OR"] = [{ userId: user.id }, { users: { some: { id: user.id } } }];
    // @TODO this is not working as expected
    // hosts: { some: { id: user.id } },
  }

  const eventTypeResult = await prisma.eventType.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      teamId: true,
      userId: true,
      team: {
        select: {
          name: true,
        },
      },
    },
    where: eventTypeWhereConditional,
  });

  return eventTypeResult;
}

function objectToCsv(data: Record<string, string>[]) {
  if (!data.length) return "";

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header]?.toString() || "";
          // Escape quotes and wrap in quotes if contains comma or newline
          return value.includes(",") || value.includes("\n") || value.includes('"')
            ? `"${value.replace(/"/g, '""')}"` // escape double quotes
            : value;
        })
        .join(",")
    ),
  ];

  return csvRows.join("\n");
}
