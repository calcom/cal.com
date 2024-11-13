import type { Prisma } from "@prisma/client";

import {
  zodFields as routingFormFieldsSchema,
  routingFormResponseInDbSchema,
} from "@calcom/app-store/routing-forms/zod";
import dayjs from "@calcom/dayjs";
import { readonlyPrisma as prisma } from "@calcom/prisma";
import type { BookingStatus } from "@calcom/prisma/enums";

type RoutingFormInsightsTeamFilter = {
  teamId?: number | null;
  isAll: boolean;
  organizationId?: number | null;
  routingFormId?: string | null;
};

type RoutingFormInsightsFilter = RoutingFormInsightsTeamFilter & {
  startDate?: string;
  endDate?: string;
  userId?: number | null;
  bookingStatus?: BookingStatus | "NO_BOOKING" | null;
  fieldFilter?: {
    fieldId: string;
    optionId: string;
  } | null;
};

class RoutingEventsInsights {
  private static async getWhereForTeamOrAllTeams({
    teamId,
    isAll,
    organizationId,
    routingFormId,
  }: RoutingFormInsightsTeamFilter) {
    // Get team IDs based on organization if applicable
    let teamIds: number[] = [];
    if (isAll && organizationId) {
      const teamsFromOrg = await prisma.team.findMany({
        where: {
          parentId: organizationId,
        },
        select: {
          id: true,
        },
      });
      teamIds = [organizationId, ...teamsFromOrg.map((t) => t.id)];
    } else if (teamId) {
      teamIds = [teamId];
    }

    // Base where condition for forms
    const formsWhereCondition: Prisma.App_RoutingForms_FormWhereInput = {
      ...(teamIds.length > 0 && {
        teamId: {
          in: teamIds,
        },
      }),
      ...(routingFormId && {
        id: routingFormId,
      }),
    };

    return formsWhereCondition;
  }

  static async getRoutingFormStats({
    teamId,
    startDate,
    endDate,
    isAll = false,
    organizationId,
    routingFormId,
    userId,
    bookingStatus,
    fieldFilter,
  }: RoutingFormInsightsFilter) {
    // Get team IDs based on organization if applicable
    const formsWhereCondition = await this.getWhereForTeamOrAllTeams({
      teamId,
      isAll,
      organizationId,
      routingFormId,
    });

    // Base where condition for responses
    const responsesWhereCondition: Prisma.App_RoutingForms_FormResponseWhereInput = {
      ...(startDate &&
        endDate && {
          createdAt: {
            gte: dayjs(startDate).startOf("day").toDate(),
            lte: dayjs(endDate).endOf("day").toDate(),
          },
        }),
      ...(userId || bookingStatus
        ? {
            ...(bookingStatus === "NO_BOOKING"
              ? { routedToBooking: null }
              : {
                  routedToBooking: {
                    ...(userId && { userId }),
                    ...(bookingStatus && { status: bookingStatus }),
                  },
                }),
          }
        : {}),
      ...(fieldFilter && {
        response: {
          path: [fieldFilter.fieldId, "value"],
          array_contains: [fieldFilter.optionId],
        },
      }),
      form: formsWhereCondition,
    };

    // Get total forms count
    const totalForms = await prisma.app_RoutingForms_Form.count({
      where: formsWhereCondition,
    });

    // Get total responses
    const totalResponses = await prisma.app_RoutingForms_FormResponse.count({
      where: responsesWhereCondition,
    });

    // Get responses without booking
    const responsesWithoutBooking = await prisma.app_RoutingForms_FormResponse.count({
      where: {
        ...responsesWhereCondition,
        routedToBookingUid: null,
      },
    });

    return {
      created: totalForms,
      total_responses: totalResponses,
      total_responses_without_booking: responsesWithoutBooking,
      total_responses_with_booking: totalResponses - responsesWithoutBooking,
    };
  }

  static async getRoutingFormsForFilters({
    teamId,
    isAll,
    organizationId,
  }: {
    teamId?: number;
    isAll: boolean;
    organizationId?: number | undefined;
    routingFormId?: string | undefined;
  }) {
    const formsWhereCondition = await this.getWhereForTeamOrAllTeams({ teamId, isAll, organizationId });
    return await prisma.app_RoutingForms_Form.findMany({
      where: formsWhereCondition,
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            responses: true,
          },
        },
      },
    });
  }

  static async getRoutingFormPaginatedResponses({
    teamId,
    startDate,
    endDate,
    isAll,
    organizationId,
    routingFormId,
    cursor,
    limit,
    userId,
    fieldFilter,
    bookingStatus,
  }: RoutingFormInsightsFilter & { cursor?: number; limit?: number }) {
    const formsTeamWhereCondition = await this.getWhereForTeamOrAllTeams({
      teamId,
      isAll,
      organizationId,
      routingFormId,
    });

    const responsesWhereCondition: Prisma.App_RoutingForms_FormResponseWhereInput = {
      ...(startDate &&
        endDate && {
          createdAt: {
            gte: dayjs(startDate).startOf("day").toDate(),
            lte: dayjs(endDate).endOf("day").toDate(),
          },
        }),
      ...(userId || bookingStatus
        ? {
            ...(bookingStatus === "NO_BOOKING"
              ? { routedToBooking: null }
              : {
                  routedToBooking: {
                    ...(userId && { userId }),
                    ...(bookingStatus && { status: bookingStatus }),
                  },
                }),
          }
        : {}),
      ...(fieldFilter && {
        response: {
          path: [fieldFilter.fieldId, "value"],
          array_contains: [fieldFilter.optionId],
        },
      }),
      form: formsTeamWhereCondition,
    };
    console.log("--------------------------------");
    console.log("responsesWhereCondition", responsesWhereCondition);

    const totalResponsePromise = prisma.app_RoutingForms_FormResponse.count({
      where: responsesWhereCondition,
    });

    const responsesPromise = prisma.app_RoutingForms_FormResponse.findMany({
      select: {
        id: true,
        response: true,
        form: {
          select: {
            id: true,
            name: true,
          },
        },
        routedToBooking: {
          select: {
            uid: true,
            status: true,
            createdAt: true,
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        createdAt: true,
      },
      where: responsesWhereCondition,
      orderBy: {
        createdAt: "desc",
      },
      take: limit ? limit + 1 : undefined, // Get one extra item to check if there are more pages
      cursor: cursor ? { id: cursor } : undefined,
    });

    const [totalResponses, responses] = await Promise.all([totalResponsePromise, responsesPromise]);

    console.log("length of responses", responses.length);
    console.log("total responses", totalResponses);
    // unique set of form ids
    const uniqueFormIds = Array.from(new Set(responses.map((r) => r.form.id)));

    const formFields = await prisma.app_RoutingForms_Form.findMany({
      where: {
        id: { in: uniqueFormIds },
      },
      select: {
        id: true,
        name: true,
        fields: true,
      },
    });

    const fields = routingFormFieldsSchema.parse(formFields.map((f) => f.fields).flat());
    const headers = fields?.map((f) => {
      return {
        id: f.id,
        label: f.label,
        options: f.options,
      };
    });

    // Parse response data
    const parsedResponses = responses.map((r) => {
      const responseData = routingFormResponseInDbSchema.parse(r.response);
      return { ...r, response: responseData };
    });

    return {
      total: totalResponses,
      data: parsedResponses,
      headers,
      nextCursor: responses.length > (limit ?? 0) ? responses[responses.length - 1].id : undefined,
    };
  }

  static async getRoutingFormFieldOptions({
    teamId,
    isAll,
    routingFormId,
    organizationId,
  }: RoutingFormInsightsTeamFilter) {
    const formsWhereCondition = await this.getWhereForTeamOrAllTeams({
      teamId,
      isAll,
      routingFormId,
      organizationId,
    });

    const routingForms = await prisma.app_RoutingForms_Form.findMany({
      where: formsWhereCondition,
      select: {
        id: true,
        fields: true,
      },
    });

    const fields = routingFormFieldsSchema.parse(routingForms.map((f) => f.fields).flat());

    return fields;
  }
}

export { RoutingEventsInsights };
