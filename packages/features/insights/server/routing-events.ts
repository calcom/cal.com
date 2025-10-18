// eslint-disable-next-line no-restricted-imports
import mapKeys from "lodash/mapKeys";
// eslint-disable-next-line no-restricted-imports
import startCase from "lodash/startCase";

import {
  RoutingFormFieldType,
  isValidRoutingFormFieldType,
} from "@calcom/app-store/routing-forms/lib/FieldTypes";
import { zodFields as routingFormFieldsSchema } from "@calcom/app-store/routing-forms/zod";
import dayjs from "@calcom/dayjs";
import type { InsightsRoutingBaseService } from "@calcom/features/insights/services/InsightsRoutingBaseService";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { readonlyPrisma as prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

type RoutingFormInsightsTeamFilter = {
  userId?: number | null;
  teamId?: number | null;
  isAll: boolean;
  organizationId?: number | null;
  routingFormId?: string | null;
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
            ...(routingFormId && { id: routingFormId }),
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
    timeZone,
  }: {
    headersPromise: ReturnType<typeof RoutingEventsInsights.getRoutingFormHeaders>;
    dataPromise: ReturnType<typeof InsightsRoutingBaseService.prototype.getTableData>;
    timeZone: string;
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
        "Submitted At_date": dayjs(item.createdAt).tz(timeZone).format("YYYY-MM-DD"),
        "Submitted At_time": dayjs(item.createdAt).tz(timeZone).format("HH:mm:ss"),
        "Has Booking": item.bookingUid !== null,
        "Booking Status": item.bookingStatus || "NO_BOOKING",
        "Booking Created At": item.bookingCreatedAt?.toISOString() || "",
        "Booking Created At_date": item.bookingCreatedAt
          ? dayjs(item.bookingCreatedAt).tz(timeZone).format("YYYY-MM-DD")
          : "",
        "Booking Created At_time": item.bookingCreatedAt
          ? dayjs(item.bookingCreatedAt).tz(timeZone).format("HH:mm:ss")
          : "",
        "Booking Start Time": item.bookingStartTime?.toISOString() || "",
        "Booking Start Time_date": item.bookingStartTime
          ? dayjs(item.bookingStartTime).tz(timeZone).format("YYYY-MM-DD")
          : "",
        "Booking Start Time_time": item.bookingStartTime
          ? dayjs(item.bookingStartTime).tz(timeZone).format("HH:mm:ss")
          : "",
        "Booking End Time": item.bookingEndTime?.toISOString() || "",
        "Booking End Time_date": item.bookingEndTime
          ? dayjs(item.bookingEndTime).tz(timeZone).format("YYYY-MM-DD")
          : "",
        "Booking End Time_time": item.bookingEndTime
          ? dayjs(item.bookingEndTime).tz(timeZone).format("HH:mm:ss")
          : "",
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
          .filter((attendee) => typeof attendee.name === "string" && typeof attendee.email === "string")
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
