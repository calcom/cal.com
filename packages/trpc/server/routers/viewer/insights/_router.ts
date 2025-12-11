import { z } from "zod";

import {
  bookingKPIStatsHandler,
  eventTrendsHandler,
  popularEventsHandler,
  averageEventDurationHandler,
  membersWithMostCancelledBookingsHandler,
  membersWithMostCompletedBookingsHandler,
  membersWithLeastCompletedBookingsHandler,
  membersWithMostBookingsHandler,
  membersWithLeastBookingsHandler,
  teamListForUserHandler,
  userListHandler,
  eventTypeListHandler,
  recentRatingsHandler,
  membersWithMostNoShowHandler,
  membersWithHighestRatingsHandler,
  membersWithLowestRatingsHandler,
  rawDataHandler,
  getRoutingFormsForFiltersHandler,
  routingFormsByStatusHandler,
  routingFormResponsesHandler,
  routingFormResponsesForDownloadHandler,
  getRoutingFormFieldOptionsHandler,
  failedBookingsByFieldHandler,
  routingFormResponsesHeadersHandler,
  routedToPerPeriodHandler,
  routedToPerPeriodCsvHandler,
  getUserRelevantTeamRoutingFormsHandler,
  getRoutingFunnelDataHandler,
  bookingsByHourStatsHandler,
  recentNoShowGuestsHandler,
  noShowHostsOverTimeHandler,
  csatOverTimeHandler,
} from "@calcom/features/insights/server/handlers";
import { userBelongsToTeamProcedure } from "@calcom/features/insights/server/procedures";
import {
  bookingRepositoryBaseInputSchema,
  insightsRoutingServiceInputSchema,
  insightsRoutingServicePaginatedInputSchema,
  routingRepositoryBaseInputSchema,
  routedToPerPeriodInputSchema,
  routedToPerPeriodCsvInputSchema,
} from "@calcom/features/insights/server/raw-data.schema";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

export const insightsRouter = router({
  bookingKPIStats: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(bookingKPIStatsHandler),

  eventTrends: userBelongsToTeamProcedure.input(bookingRepositoryBaseInputSchema).query(eventTrendsHandler),

  popularEvents: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(popularEventsHandler),

  averageEventDuration: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(averageEventDurationHandler),

  membersWithMostCancelledBookings: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(membersWithMostCancelledBookingsHandler),

  membersWithMostCompletedBookings: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(membersWithMostCompletedBookingsHandler),

  membersWithLeastCompletedBookings: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(membersWithLeastCompletedBookingsHandler),

  membersWithMostBookings: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(membersWithMostBookingsHandler),

  membersWithLeastBookings: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(membersWithLeastBookingsHandler),

  teamListForUser: authedProcedure.query(teamListForUserHandler),

  userList: authedProcedure
    .input(
      z.object({
        teamId: z.number().optional(),
        isAll: z.boolean().nullable(),
      })
    )
    .query(userListHandler),

  eventTypeList: userBelongsToTeamProcedure
    .input(
      z.object({
        teamId: z.coerce.number().nullish(),
        userId: z.coerce.number().nullish(),
        isAll: z.boolean().optional(),
      })
    )
    .query(eventTypeListHandler),

  recentRatings: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(recentRatingsHandler),

  membersWithMostNoShow: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(membersWithMostNoShowHandler),

  membersWithHighestRatings: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(membersWithHighestRatingsHandler),

  membersWithLowestRatings: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(membersWithLowestRatingsHandler),

  rawData: userBelongsToTeamProcedure
    .input(
      bookingRepositoryBaseInputSchema.extend({
        limit: z.number().max(100).optional(),
        offset: z.number().optional(),
      })
    )
    .query(rawDataHandler),

  getRoutingFormsForFilters: userBelongsToTeamProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        teamId: z.number().optional(),
        isAll: z.boolean(),
      })
    )
    .query(getRoutingFormsForFiltersHandler),

  routingFormsByStatus: userBelongsToTeamProcedure
    .input(insightsRoutingServiceInputSchema)
    .query(routingFormsByStatusHandler),

  routingFormResponses: userBelongsToTeamProcedure
    .input(insightsRoutingServicePaginatedInputSchema)
    .query(routingFormResponsesHandler),

  routingFormResponsesForDownload: userBelongsToTeamProcedure
    .input(insightsRoutingServicePaginatedInputSchema)
    .query(routingFormResponsesForDownloadHandler),

  getRoutingFormFieldOptions: userBelongsToTeamProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        teamId: z.number().optional(),
        isAll: z.boolean(),
        routingFormId: z.string().optional(),
      })
    )
    .query(getRoutingFormFieldOptionsHandler),

  failedBookingsByField: userBelongsToTeamProcedure
    .input(insightsRoutingServiceInputSchema)
    .query(failedBookingsByFieldHandler),

  routingFormResponsesHeaders: userBelongsToTeamProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        teamId: z.number().optional(),
        isAll: z.boolean(),
        routingFormId: z.string().optional(),
      })
    )
    .query(routingFormResponsesHeadersHandler),

  routedToPerPeriod: userBelongsToTeamProcedure
    .input(routedToPerPeriodInputSchema)
    .query(routedToPerPeriodHandler),

  routedToPerPeriodCsv: userBelongsToTeamProcedure
    .input(routedToPerPeriodCsvInputSchema)
    .query(routedToPerPeriodCsvHandler),

  getUserRelevantTeamRoutingForms: authedProcedure.query(getUserRelevantTeamRoutingFormsHandler),

  getRoutingFunnelData: userBelongsToTeamProcedure
    .input(routingRepositoryBaseInputSchema)
    .query(getRoutingFunnelDataHandler),

  bookingsByHourStats: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(bookingsByHourStatsHandler),

  recentNoShowGuests: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(recentNoShowGuestsHandler),

  noShowHostsOverTime: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(noShowHostsOverTimeHandler),

  csatOverTime: userBelongsToTeamProcedure.input(bookingRepositoryBaseInputSchema).query(csatOverTimeHandler),
});
