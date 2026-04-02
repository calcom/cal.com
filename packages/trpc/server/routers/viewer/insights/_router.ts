import dayjs from "@calcom/dayjs";
import { getInsightsBookingService } from "@calcom/features/di/containers/InsightsBooking";
import { getInsightsRoutingService } from "@calcom/features/di/containers/InsightsRouting";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import {
  extractDateRangeFromColumnFilters,
  replaceDateRangeColumnFilter,
} from "@calcom/features/insights/lib/bookingUtils";
import { objectToCsv } from "@calcom/features/insights/lib/objectToCsv";
import {
  type GetDateRangesParams,
  getDateRanges,
  getTimeView,
} from "@calcom/features/insights/server/insightsDateUtils";
import {
  bookingRepositoryBaseInputSchema,
  insightsRoutingServiceInputSchema,
  insightsRoutingServicePaginatedInputSchema,
  routedToPerPeriodCsvInputSchema,
  routedToPerPeriodInputSchema,
  routingRepositoryBaseInputSchema,
} from "@calcom/features/insights/server/raw-data.schema";
import { RoutingEventsInsights } from "@calcom/features/insights/server/routing-events";
import { VirtualQueuesInsights } from "@calcom/features/insights/server/virtual-queues";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import type { PrismaClient } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import authedProcedure from "@calcom/trpc/server/procedures/authedProcedure";
import { router } from "@calcom/trpc/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { userBelongsToTeamProcedure } from "./procedures/userBelongsToTeam";

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
  input: z.infer<typeof bookingRepositoryBaseInputSchema>
) {
  const { scope, selectedTeamId, columnFilters } = input;
  return getInsightsBookingService({
    options: {
      scope,
      userId: ctx.user.id,
      orgId: ctx.user.organizationId,
      ...(selectedTeamId && { teamId: selectedTeamId }),
    },
    filters: {
      ...(columnFilters && { columnFilters }),
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
  bookingKPIStats: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const currentPeriodService = createInsightsBookingService(ctx, input);

      // Get current period stats
      const currentStats = await currentPeriodService.getBookingStats();

      // Calculate previous period dates and create service for previous period
      const previousPeriodDates = currentPeriodService.calculatePreviousPeriodDates();
      const previousPeriodColumnFilters = replaceDateRangeColumnFilter({
        columnFilters: input.columnFilters,
        newStartDate: previousPeriodDates.startDate,
        newEndDate: previousPeriodDates.endDate,
      });

      const previousPeriodService = createInsightsBookingService(ctx, {
        ...input,
        columnFilters: previousPeriodColumnFilters,
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
  eventTrends: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const { columnFilters, timeZone } = input;
      const { startDate, endDate } = extractDateRangeFromColumnFilters(columnFilters);

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
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  popularEvents: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ input, ctx }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input);

      try {
        return await insightsBookingService.getPopularEventsStats();
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  averageEventDuration: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const { columnFilters, timeZone } = input;
      const { startDate, endDate, dateTarget } = extractDateRangeFromColumnFilters(columnFilters);

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
            startTime: true,
          },
        });

        const resultMap = new Map<string, { totalDuration: number; count: number }>();

        // Initialize the map with all date ranges
        for (const range of dateRanges) {
          resultMap.set(dayjs(range.startDate).format("ll"), { totalDuration: 0, count: 0 });
        }

        for (const booking of allBookings) {
          const periodStart = dayjs(dateTarget === "startTime" ? booking.startTime : booking.createdAt)
            .startOf(startOfEndOf)
            .format("ll");
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
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  membersWithMostCancelledBookings: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ input, ctx }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input);

      try {
        return await insightsBookingService.getMembersStatsWithCount({
          type: "cancelled",
          sortOrder: "DESC",
        });
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  membersWithMostCompletedBookings: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ input, ctx }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input);

      try {
        return await insightsBookingService.getMembersStatsWithCount({
          type: "accepted",
          sortOrder: "DESC",
          completed: true,
        });
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  membersWithLeastCompletedBookings: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ input, ctx }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input);

      try {
        return await insightsBookingService.getMembersStatsWithCount({
          type: "accepted",
          sortOrder: "ASC",
          completed: true,
        });
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  membersWithMostBookings: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ input, ctx }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input);

      try {
        return await insightsBookingService.getMembersStatsWithCount({ type: "all", sortOrder: "DESC" });
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  membersWithLeastBookings: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ input, ctx }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input);

      try {
        return await insightsBookingService.getMembersStatsWithCount({ type: "all", sortOrder: "ASC" });
      } catch {
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

    // Get all team IDs where user has insights.read permission in a single optimized query
    // This properly handles both PBAC permissions and traditional role-based access
    const permissionCheckService = new PermissionCheckService();
    const teamIdsWithAccess = await permissionCheckService.getTeamIdsWithPermission({
      userId: user.id,
      permission: "insights.read",
      fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
    });

    if (teamIdsWithAccess.length === 0) {
      return [];
    }

    // Fetch only teams where user has both membership AND insights access
    // This avoids fetching unnecessary team data by filtering at the database level
    const belongsToTeams = await ctx.insightsDb.membership.findMany({
      where: {
        team: {
          slug: { not: null },
        },
        accepted: true,
        userId: user.id,
        teamId: { in: teamIdsWithAccess },
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

    const result: IResultTeamList[] = belongsToTeams.map((membership) => ({ ...membership.team }));

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
  eventTypeList: userBelongsToTeamProcedure
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

      const eventTypeRepository = new EventTypeRepository(prisma);
      const eventTypeList = await eventTypeRepository.getEventTypeList({
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
  recentRatings: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input);
      return await insightsBookingService.getRecentRatingsStats();
    }),
  membersWithMostNoShow: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ input, ctx }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input);

      try {
        return await insightsBookingService.getMembersStatsWithCount({ type: "noShow", sortOrder: "DESC" });
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  membersWithHighestRatings: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input);
      return await insightsBookingService.getMembersRatingStats("DESC");
    }),
  membersWithLowestRatings: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input);
      return await insightsBookingService.getMembersRatingStats("ASC");
    }),
  rawData: userBelongsToTeamProcedure
    .input(
      bookingRepositoryBaseInputSchema.extend({
        limit: z.number().max(100).optional(),
        offset: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, offset, timeZone } = input;

      const insightsBookingService = createInsightsBookingService(ctx, input);

      try {
        return await insightsBookingService.getCsvData({
          limit: limit ?? 100,
          offset: offset ?? 0,
          timeZone,
        });
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  getRoutingFormsForFilters: userBelongsToTeamProcedure
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
  routingFormsByStatus: userBelongsToTeamProcedure
    .input(insightsRoutingServiceInputSchema)
    .query(async ({ ctx, input }) => {
      const insightsRoutingService = createInsightsRoutingService(ctx, input);
      return await insightsRoutingService.getRoutingFormStats();
    }),
  routingFormResponses: userBelongsToTeamProcedure
    .input(insightsRoutingServicePaginatedInputSchema)
    .query(async ({ ctx, input }) => {
      const insightsRoutingService = createInsightsRoutingService(ctx, input);
      return await insightsRoutingService.getTableData({
        sorting: input.sorting,
        limit: input.limit,
        offset: input.offset,
      });
    }),
  routingFormResponsesForDownload: userBelongsToTeamProcedure
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
        timeZone: ctx.user.timeZone,
      });
    }),
  getRoutingFormFieldOptions: userBelongsToTeamProcedure
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
  failedBookingsByField: userBelongsToTeamProcedure
    .input(insightsRoutingServiceInputSchema)
    .query(async ({ ctx, input }) => {
      const insightsRoutingService = createInsightsRoutingService(ctx, input);
      try {
        return await insightsRoutingService.getFailedBookingsByFieldData();
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  routingFormResponsesHeaders: userBelongsToTeamProcedure
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
  routedToPerPeriod: userBelongsToTeamProcedure
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
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  routedToPerPeriodCsv: userBelongsToTeamProcedure
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
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  getUserRelevantTeamRoutingForms: authedProcedure.query(async ({ ctx }) => {
    try {
      const routingForms = await VirtualQueuesInsights.getUserRelevantTeamRoutingForms({
        userId: ctx.user.id,
      });

      return routingForms;
    } catch {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  }),
  getRoutingFunnelData: userBelongsToTeamProcedure
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
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  bookingsByHourStats: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const { timeZone } = input;
      const insightsBookingService = createInsightsBookingService(ctx, input);

      try {
        return await insightsBookingService.getBookingsByHourStats({
          timeZone,
        });
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  recentNoShowGuests: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input);

      try {
        return await insightsBookingService.getRecentNoShowGuests();
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  noShowHostsOverTime: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const { columnFilters, timeZone } = input;
      const { startDate, endDate } = extractDateRangeFromColumnFilters(columnFilters);

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
        return await insightsBookingService.getNoShowHostsOverTimeStats({
          timeZone,
          dateRanges,
        });
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  csatOverTime: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const { columnFilters, timeZone } = input;
      const { startDate, endDate } = extractDateRangeFromColumnFilters(columnFilters);

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
        return await insightsBookingService.getCSATOverTimeStats({
          timeZone,
          dateRanges,
        });
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
});
