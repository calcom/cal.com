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

    if (teamIds.length === 0 && !routingFormId) {
      if (!organizationId) {
        throw new Error("Organization ID is required");
      }
      formsWhereCondition.teamId = organizationId;
    }

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
    const totalFormsPromise = prisma.app_RoutingForms_Form.count({
      where: formsWhereCondition,
    });

    // Get total responses
    const totalResponsesPromise = prisma.app_RoutingForms_FormResponse.count({
      where: responsesWhereCondition,
    });

    // Get responses without booking
    const responsesWithoutBookingPromise = prisma.app_RoutingForms_FormResponse.count({
      where: {
        ...responsesWhereCondition,
        routedToBookingUid: null,
      },
    });

    const [totalForms, totalResponses, responsesWithoutBooking] = await Promise.all([
      totalFormsPromise,
      totalResponsesPromise,
      responsesWithoutBookingPromise,
    ]);

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
            assignmentReason: {
              select: { reasonString: true },
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

    // Parse response data
    const parsedResponses = responses.map((r) => {
      const responseData = routingFormResponseInDbSchema.parse(r.response);
      return { ...r, response: responseData };
    });

    return {
      total: totalResponses,
      data: parsedResponses,
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

    // If youre at this point wondering what this does. This groups the responses by form and field and counts the number of responses for each option that don't have a booking.
    const result = await prisma.$queryRaw<
      {
        formId: string;
        formName: string;
        fieldId: string;
        fieldLabel: string;
        optionId: string;
        optionLabel: string;
        count: number;
      }[]
    >`
      WITH form_fields AS (
        SELECT
          f.id as form_id,
          f.name as form_name,
          field->>'id' as field_id,
          field->>'label' as field_label,
          opt->>'id' as option_id,
          opt->>'label' as option_label
        FROM "App_RoutingForms_Form" f,
        LATERAL jsonb_array_elements(f.fields) as field
        LEFT JOIN LATERAL jsonb_array_elements(field->'options') as opt ON true
        WHERE true
        ${whereClause}
      ),
      response_stats AS (
        SELECT
          r."formId",
          key as field_id,
          CASE
            WHEN jsonb_typeof(value->'value') = 'array' THEN
              v.value_item
            ELSE
              value->>'value'
          END as selected_option,
          COUNT(DISTINCT r.id) as response_count
        FROM "App_RoutingForms_FormResponse" r
        CROSS JOIN jsonb_each(r.response::jsonb) as fields(key, value)
        LEFT JOIN LATERAL jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(value->'value') = 'array'
            THEN value->'value'
            ELSE NULL
          END
        ) as v(value_item) ON true
        WHERE r."routedToBookingUid" IS NULL
        GROUP BY r."formId", key, selected_option
      )
      SELECT
        ff.form_id as "formId",
        ff.form_name as "formName",
        ff.field_id as "fieldId",
        ff.field_label as "fieldLabel",
        ff.option_id as "optionId",
        ff.option_label as "optionLabel",
        COALESCE(rs.response_count, 0)::integer as count
      FROM form_fields ff
      LEFT JOIN response_stats rs ON
        rs."formId" = ff.form_id AND
        rs.field_id = ff.field_id AND
        rs.selected_option = ff.option_id
      WHERE ff.option_id IS NOT NULL
      ORDER BY count DESC`;

    // First group by form and field
    const groupedByFormAndField = result.reduce((acc, curr) => {
      const formKey = curr.formName;
      acc[formKey] = acc[formKey] || {};
      const labelKey = curr.fieldLabel;
      acc[formKey][labelKey] = acc[formKey][labelKey] || [];
      acc[formKey][labelKey].push({
        optionId: curr.optionId,
        count: curr.count,
        optionLabel: curr.optionLabel,
      });
      return acc;
    }, {} as Record<string, Record<string, { optionId: string; count: number; optionLabel: string }[]>>);

    // NOTE: totalCount represents the sum of all response counts across all fields and options for a form
    // For example, if a form has 2 fields with 2 options each:
    // Field1: Option1 (5 responses), Option2 (3 responses)
    // Field2: Option1 (2 responses), Option2 (4 responses)
    // Then totalCount = 5 + 3 + 2 + 4 = 14 total responses
    const sortedEntries = Object.entries(groupedByFormAndField)
      .map(([formName, fields]) => ({
        formName,
        fields,
        totalCount: Object.values(fields)
          .flat()
          .reduce((sum, item) => sum + item.count, 0),
      }))
      .sort((a, b) => b.totalCount - a.totalCount);

    // Convert back to original format
    const sortedGroupedByFormAndField = sortedEntries.reduce((acc, { formName, fields }) => {
      acc[formName] = fields;
      return acc;
    }, {} as Record<string, Record<string, { optionId: string; count: number; optionLabel: string }[]>>);

    return sortedGroupedByFormAndField;
  }

  static async getRoutingFormHeaders({
    teamId,
    isAll,
    organizationId,
    routingFormId,
  }: RoutingFormInsightsTeamFilter) {
    const formsWhereCondition = await this.getWhereForTeamOrAllTeams({
      teamId,
      isAll,
      organizationId,
      routingFormId,
    });

    const routingForms = await prisma.app_RoutingForms_Form.findMany({
      where: formsWhereCondition,
      select: {
        id: true,
        name: true,
        fields: true,
      },
    });

    const fields = routingFormFieldsSchema.parse(routingForms.map((f) => f.fields).flat());
    const headers = fields?.map((f) => {
      return {
        id: f.id,
        label: f.label,
        options: f.options,
      };
    });

    return headers;
  }

  static async getRawData({
    teamId,
    startDate,
    endDate,
    isAll,
    organizationId,
    routingFormId,
    userId,
    bookingStatus,
    fieldFilter,
    take,
    skip,
  }: RoutingFormInsightsFilter & { take?: number; skip?: number }) {
    const formsWhereCondition = await this.getWhereForTeamOrAllTeams({
      teamId,
      isAll,
      organizationId,
      routingFormId,
    });

    // First get all forms and their fields to build a mapping
    const forms = await prisma.app_RoutingForms_Form.findMany({
      where: formsWhereCondition,
      select: {
        id: true,
        name: true,
        fields: true,
      },
    });

    // Create a mapping of form ID to fields
    type FormFieldOption = {
      label: string;
      type: string;
      options: Record<string, string>;
    };

    type FormFieldsMap = Record<string, Record<string, FormFieldOption>>;

    const formFieldsMap = forms.reduce((acc, form) => {
      const fields = routingFormFieldsSchema.parse(form.fields);
      acc[form.id] =
        fields?.reduce((fieldMap: Record<string, FormFieldOption>, field) => {
          fieldMap[field.id] = {
            label: field.label,
            type: field.type,
            options:
              field.options?.reduce((optMap, opt) => {
                if (opt.id !== null) {
                  optMap[opt.id] = opt.label;
                }
                return optMap;
              }, {} as Record<string, string>) ?? {},
          };
          return fieldMap;
        }, {}) || {};
      return acc;
    }, {} as FormFieldsMap);

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

    const responses = await prisma.app_RoutingForms_FormResponse.findMany({
      select: {
        id: true,
        response: true,
        createdAt: true,
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
            startTime: true,
            endTime: true,
            attendees: {
              select: {
                email: true,
                name: true,
                timeZone: true,
              },
            },
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            assignmentReason: {
              select: {
                reasonString: true,
              },
            },
          },
        },
      },
      where: responsesWhereCondition,
      orderBy: {
        createdAt: "desc",
      },
      take: take,
      skip: skip,
    });

    // Transform the data into a flat structure suitable for CSV
    return responses.map((response) => {
      const parsedResponse = routingFormResponseInDbSchema.parse(response.response);
      const formFields = formFieldsMap[response.form.id];

      const flatResponse: Record<string, unknown> = {
        "Response ID": response.id,
        "Form Name": response.form.name,
        "Submitted At": response.createdAt.toISOString(),
        "Has Booking": !!response.routedToBooking,
        "Booking Status": response.routedToBooking?.status || "NO_BOOKING",
        "Booking Created At": response.routedToBooking?.createdAt?.toISOString() || "",
        "Booking Start Time": response.routedToBooking?.startTime?.toISOString() || "",
        "Booking End Time": response.routedToBooking?.endTime?.toISOString() || "",
        "Attendee Name": response.routedToBooking?.attendees[0]?.name || "",
        "Attendee Email": response.routedToBooking?.attendees[0]?.email || "",
        "Attendee Timezone": response.routedToBooking?.attendees[0]?.timeZone || "",
        "Assignment Reason": response.routedToBooking?.assignmentReason[0].reasonString || "",
        "Routed To Name": response.routedToBooking?.user?.name || "",
        "Routed To Email": response.routedToBooking?.user?.email || "",
      };

      // Add form fields as columns with their labels
      Object.entries(parsedResponse).forEach(([fieldId, field]) => {
        const fieldInfo = formFields[fieldId];
        if (fieldInfo) {
          const fieldLabel = fieldInfo.label;
          if (Array.isArray(field.value)) {
            // For multi-select fields, map the IDs to labels
            const values = field.value.map((val) => fieldInfo.options[val] || val);
            flatResponse[fieldLabel] = values.join(", ");
          } else {
            // For single-select fields, map the ID to label
            flatResponse[fieldLabel] = fieldInfo.options[field.value] || field.value;
          }
        }
      });

      return flatResponse;
    });
  }
}

export { RoutingEventsInsights };
