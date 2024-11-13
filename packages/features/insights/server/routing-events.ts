import { Prisma } from "@prisma/client";

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
            attendees: {
              select: {
                timeZone: true,
                email: true,
              },
            },
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

  static async getFailedBookingsByRoutingFormGroup({
    teamId,
    isAll,
    routingFormId,
    organizationId,
  }: RoutingFormInsightsTeamFilter) {
    const formsWhereCondition = await this.getWhereForTeamOrAllTeams({
      teamId,
      isAll,
      organizationId,
      routingFormId,
    });

    const teamConditions = [];

    // @ts-expect-error it doest exist but TS isnt smart enough when its unmber or int filter
    if (formsWhereCondition.teamId?.in) {
      // @ts-expect-error it doest exist but TS isnt smart enough when its unmber or int filter
      teamConditions.push(`f."teamId" IN (${formsWhereCondition.teamId.in.join(",")})`);
    }
    if (routingFormId) {
      teamConditions.push(`f.id = '${routingFormId}'`);
    }

    const whereClause = teamConditions.length
      ? Prisma.sql`AND ${Prisma.raw(teamConditions.join(" AND "))}`
      : Prisma.sql``;

    const result = await prisma.$queryRaw<
      {
        formId: string;
        formName: string;
        fieldId: string;
        fieldLabel: string;
        optionId: string;
        count: number;
        routes: Prisma.JsonValue;
      }[]
    >`
      WITH response_data AS (
        SELECT 
          r.id as response_id,
          r."formId",
          r.response::jsonb as response_json
        FROM "App_RoutingForms_FormResponse" r
        WHERE r."routedToBookingUid" IS NULL
      ),
      field_values AS (
        SELECT 
          rd.response_id,
          rd."formId",
          key as field_id,
          value->>'label' as field_label,
          CASE 
            WHEN jsonb_typeof(value->'value') = 'array' THEN 
              jsonb_array_elements_text(value->'value')
            ELSE 
              value->>'value'
          END as option_value
        FROM response_data rd,
             jsonb_each(rd.response_json) as fields(key, value)
      )
      SELECT 
        f.id as "formId",
        f.name as "formName",
        fv.field_id as "fieldId",
        fv.field_label as "fieldLabel",
        fv.option_value as "optionId",
        COUNT(DISTINCT fv.response_id)::integer as count,
        f.routes as routes
      FROM field_values fv
      JOIN "App_RoutingForms_Form" f ON f.id = fv."formId"
      WHERE fv.option_value IS NOT NULL
      ${whereClause}
      GROUP BY 
        f.id,
        f.name,
        fv.field_id,
        fv.field_label,
        fv.option_value,
        f.routes
      ORDER BY count DESC`;

    console.log(result);

    return result.map((row) => ({
      ...row,
      routes: row.routes as any[],
    }));
  }
}

export { RoutingEventsInsights };
