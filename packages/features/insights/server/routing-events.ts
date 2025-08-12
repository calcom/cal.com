import { Prisma } from "@prisma/client";
// eslint-disable-next-line no-restricted-imports
import mapKeys from "lodash/mapKeys";
// eslint-disable-next-line no-restricted-imports
import startCase from "lodash/startCase";

import {
  RoutingFormFieldType,
  isValidRoutingFormFieldType,
} from "@calcom/app-store/routing-forms/lib/FieldTypes";
import { zodFields as routingFormFieldsSchema } from "@calcom/app-store/routing-forms/zod";
import type { RoutingFormStatsInput } from "@calcom/features/insights/server/raw-data.schema";
import { WEBAPP_URL } from "@calcom/lib/constants";
import type { InsightsRoutingService } from "@calcom/lib/server/service/insightsRouting";
import { readonlyPrisma as prisma } from "@calcom/prisma";

type RoutingFormInsightsTeamFilter = {
  userId?: number | null;
  teamId?: number | null;
  isAll: boolean;
  organizationId?: number | null;
  routingFormId?: string | null;
};

type RoutingFormStatsFilter = RoutingFormStatsInput & {
  organizationId: number | null;
};

type WhereForTeamOrAllTeams = Pick<Prisma.App_RoutingForms_FormWhereInput, "id" | "teamId" | "userId">;

class RoutingEventsInsights {
  private static async getWhereForTeamOrAllTeams({
    userId,
    teamId,
    isAll,
    organizationId,
    routingFormId,
  }: RoutingFormInsightsTeamFilter): Promise<WhereForTeamOrAllTeams> {
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

    // Filter teamIds to only include teams the user has access to
    if (teamIds.length > 0) {
      const accessibleTeams = await prisma.membership.findMany({
        where: {
          userId: userId ?? -1,
          teamId: {
            in: teamIds,
          },
          accepted: true,
        },
        select: {
          teamId: true,
        },
      });
      teamIds = accessibleTeams.map((membership) => membership.teamId);
    }

    // Base where condition for forms
    const formsWhereCondition: WhereForTeamOrAllTeams = {
      ...(teamIds.length > 0
        ? {
            teamId: {
              in: teamIds,
            },
          }
        : {
            userId: userId ?? -1,
            teamId: null,
          }),
      ...(routingFormId && {
        id: routingFormId,
      }),
    };

    return formsWhereCondition;
  }

  static async getRoutingFormsForFilters({
    userId,
    teamId,
    isAll,
    organizationId,
  }: {
    userId: number;
    teamId?: number;
    isAll: boolean;
    organizationId?: number | undefined;
    routingFormId?: string | undefined;
  }) {
    const formsWhereCondition = await this.getWhereForTeamOrAllTeams({
      userId,
      teamId,
      isAll,
      organizationId,
    });
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

  static async getRoutingFormPaginatedResponsesForDownload({
    headersPromise,
    dataPromise,
  }: {
    headersPromise: ReturnType<typeof RoutingEventsInsights.getRoutingFormHeaders>;
    dataPromise: ReturnType<typeof InsightsRoutingService.prototype.getTableData>;
  }) {
    const [headers, data] = await Promise.all([headersPromise, dataPromise]);

    const dataWithFlatResponse = data.data.map((item) => {
      const bookingAttendees = item.bookingAttendees || [];

      const fields = (headers || []).reduce((acc, header) => {
        const id = header.id;
        const field = item.fields.find((field) => field.fieldId === id);
        if (!field) {
          acc[header.label] = "";
          return acc;
        }
        if (header.type === "select") {
          acc[header.label] = header.options?.find((option) => option.id === field.valueString)?.label;
        } else if (header.type === "multiselect" && Array.isArray(field.valueStringArray)) {
          acc[header.label] = field.valueStringArray
            .map((value) => header.options?.find((option) => option.id === value)?.label)
            .filter((label): label is string => label !== undefined)
            .sort()
            .join(", ");
        } else if (header.type === "number") {
          acc[header.label] = field.valueNumber?.toString() || "";
        } else {
          acc[header.label] = field.valueString || "";
        }
        return acc;
      }, {} as Record<string, string | undefined>);

      return {
        "Booking UID": item.bookingUid,
        "Booking Link": item.bookingUid ? `${WEBAPP_URL}/booking/${item.bookingUid}` : "",
        "Response ID": item.id,
        "Form Name": item.formName,
        "Submitted At": item.createdAt.toISOString(),
        "Has Booking": item.bookingUid !== null,
        "Booking Status": item.bookingStatus || "NO_BOOKING",
        "Booking Created At": item.bookingCreatedAt?.toISOString() || "",
        "Booking Start Time": item.bookingStartTime?.toISOString() || "",
        "Booking End Time": item.bookingEndTime?.toISOString() || "",
        "Assignment Reason": item.bookingAssignmentReason || "",
        "Routed To Name": item.bookingUserName || "",
        "Routed To Email": item.bookingUserEmail || "",
        ...mapKeys(fields, (_, key) => startCase(key)),
        utm_source: item.utm_source || "",
        utm_medium: item.utm_medium || "",
        utm_campaign: item.utm_campaign || "",
        utm_term: item.utm_term || "",
        utm_content: item.utm_content || "",
        ...((bookingAttendees || [])
          .filter(
            (attendee): attendee is { name: string; email: string; timeZone: string | null } =>
              typeof attendee.name === "string" && typeof attendee.email === "string"
          )
          .reduce((acc, attendee, index) => {
            acc[`Attendee ${index + 1}`] = `${attendee.name} (${attendee.email})`;
            return acc;
          }, {} as Record<string, string>) || {}),
      };
    });

    return {
      data: dataWithFlatResponse,
      total: data.total,
    };
  }

  static async getRoutingFormFieldOptions({
    userId,
    teamId,
    isAll,
    routingFormId,
    organizationId,
  }: RoutingFormInsightsTeamFilter) {
    const formsWhereCondition = await this.getWhereForTeamOrAllTeams({
      userId,
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
    userId,
    teamId,
    isAll,
    routingFormId,
    organizationId,
  }: RoutingFormInsightsTeamFilter) {
    const formsWhereCondition = await this.getWhereForTeamOrAllTeams({
      userId,
      teamId,
      isAll,
      organizationId,
      routingFormId,
    });

    const teamConditions = [];

    // @ts-expect-error it doesn't exist but TS isn't smart enough when it's a number or int filter
    if (formsWhereCondition.teamId?.in) {
      // @ts-expect-error it doesn't exist but TS isn't smart enough when it's a number or int filter
      teamConditions.push(`f."teamId" IN (${formsWhereCondition.teamId.in.join(",")})`);
    }
    // @ts-expect-error it doesn't exist but TS isn't smart enough when it's a number or int filter
    if (!formsWhereCondition.teamId?.in && userId) {
      teamConditions.push(`f."userId" = ${userId}`);
    }
    if (routingFormId) {
      teamConditions.push(`f.id = '${routingFormId}'`);
    }

    const whereClause = teamConditions.length
      ? Prisma.sql`AND ${Prisma.raw(teamConditions.join(" AND "))}`
      : Prisma.sql``;

    // If you're at this point wondering what this does. This groups the responses by form and field and counts the number of responses for each option that don't have a booking.
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
    userId,
    teamId,
    isAll,
    organizationId,
    routingFormId,
  }: RoutingFormInsightsTeamFilter) {
    const formsWhereCondition = await this.getWhereForTeamOrAllTeams({
      userId,
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
    const ids = new Set<string>();
    const headers = (fields || [])
      .map((f) => {
        return {
          id: f.id,
          label: f.label,
          type: f.type,
          options: f.options,
        };
      })
      .filter((field) => {
        if (!field.label || !isValidRoutingFormFieldType(field.type)) {
          return false;
        }
        if (
          field.type === RoutingFormFieldType.SINGLE_SELECT ||
          field.type === RoutingFormFieldType.MULTI_SELECT
        ) {
          return field.options && field.options.length > 0;
        }
        return true;
      })
      .filter((field) => {
        // Remove duplicate fields
        // because we aggregate fields from multiple routing forms.
        if (ids.has(field.id)) {
          return false;
        } else {
          ids.add(field.id);
          return true;
        }
      });

    return headers;
  }

  static objectToCsv(data: Record<string, string>[]) {
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
}

export { RoutingEventsInsights };
