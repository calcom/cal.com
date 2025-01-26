import { Prisma } from "@prisma/client";
// eslint-disable-next-line no-restricted-imports
import mapKeys from "lodash/mapKeys";
// eslint-disable-next-line no-restricted-imports
import startCase from "lodash/startCase";

import {
  zodFields as routingFormFieldsSchema,
  routingFormResponseInDbSchema,
} from "@calcom/app-store/routing-forms/zod";
import dayjs from "@calcom/dayjs";
import type { ColumnFilter, TypedColumnFilter, ColumnFilterType } from "@calcom/features/data-table";
import { makeWhereClause, makeOrderBy } from "@calcom/features/data-table/lib/server";
import type { RoutingFormResponsesInput } from "@calcom/features/insights/server/raw-data.schema";
import { readonlyPrisma as prisma } from "@calcom/prisma";
import type { BookingStatus } from "@calcom/prisma/enums";

import { type ResponseValue, ZResponse } from "../lib/types";

type RoutingFormInsightsTeamFilter = {
  userId?: number | null;
  teamId?: number | null;
  isAll: boolean;
  organizationId?: number | null;
  routingFormId?: string | null;
};

type RoutingFormInsightsFilter = RoutingFormInsightsTeamFilter & {
  startDate?: string;
  endDate?: string;
  memberUserId?: number | null;
  searchQuery?: string | null;
  bookingStatus?: BookingStatus | "NO_BOOKING" | null;
  fieldFilter?: {
    fieldId: string;
    optionId: string;
  } | null;
  columnFilters: ColumnFilter[];
};

type RoutingFormResponsesFilter = RoutingFormResponsesInput & {
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

  static async getRoutingFormStats({
    teamId,
    startDate,
    endDate,
    isAll = false,
    organizationId,
    routingFormId,
    userId,
    memberUserId,
    searchQuery,
    bookingStatus,
    fieldFilter,
  }: Omit<RoutingFormInsightsFilter, "columnFilters">) {
    // Get team IDs based on organization if applicable
    const formsWhereCondition = await this.getWhereForTeamOrAllTeams({
      userId,
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
      ...(memberUserId || bookingStatus || searchQuery
        ? {
            ...(bookingStatus === "NO_BOOKING"
              ? { routedToBooking: null }
              : {
                  routedToBooking: {
                    ...(memberUserId && { userId: memberUserId }),
                    ...(searchQuery && {
                      user: {
                        OR: [
                          { email: { contains: searchQuery, mode: "insensitive" } },
                          { name: { contains: searchQuery, mode: "insensitive" } },
                        ],
                      },
                    }),
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
    userId,
    teamId,
    isAll,
    organizationId,
  }: {
    userId?: number;
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
    memberUserIds,
    columnFilters,
    sorting,
  }: RoutingFormResponsesFilter) {
    const formsTeamWhereCondition = await this.getWhereForTeamOrAllTeams({
      userId,
      teamId,
      isAll,
      organizationId,
      routingFormId,
    });

    const getLowercasedFilterValue = <TData extends ColumnFilterType>(filter: TypedColumnFilter<TData>) => {
      if (filter.value.type === "text") {
        return {
          ...filter.value,
          data: {
            ...filter.value.data,
            operand: filter.value.data.operand.toLowerCase(),
          },
        };
      }
      return filter.value;
    };

    const bookingStatusOrder = columnFilters.find((filter) => filter.id === "bookingStatusOrder");
    const bookingAssignmentReason = columnFilters.find(
      (filter) => filter.id === "bookingAssignmentReason"
    ) as TypedColumnFilter<"text"> | undefined;
    const assignmentReasonValue = bookingAssignmentReason
      ? getLowercasedFilterValue(bookingAssignmentReason)
      : undefined;

    const responseFilters = columnFilters.filter(
      (filter) => filter.id !== "bookingStatusOrder" && filter.id !== "bookingAssignmentReason"
    );

    const whereClause: Prisma.RoutingFormResponseWhereInput = {
      ...(formsTeamWhereCondition.id !== undefined && {
        formId: formsTeamWhereCondition.id as string | Prisma.StringFilter<"RoutingFormResponse">,
      }),
      ...(formsTeamWhereCondition.teamId !== undefined && {
        formTeamId: formsTeamWhereCondition.teamId as number | Prisma.IntFilter<"RoutingFormResponse">,
      }),
      ...(formsTeamWhereCondition.userId !== undefined && {
        formUserId: formsTeamWhereCondition.userId as number | Prisma.IntFilter<"RoutingFormResponse">,
      }),

      // bookingStatus
      ...(bookingStatusOrder &&
        makeWhereClause({ columnName: "bookingStatusOrder", filterValue: bookingStatusOrder.value })),

      // bookingAssignmentReason
      ...(assignmentReasonValue &&
        makeWhereClause({
          columnName: "bookingAssignmentReasonLowercase",
          filterValue: assignmentReasonValue,
        })),

      // memberUserId
      ...(memberUserIds && memberUserIds.length > 0 && { bookingUserId: { in: memberUserIds } }),

      // createdAt
      ...(startDate &&
        endDate && {
          createdAt: {
            gte: dayjs(startDate).startOf("day").toDate(),
            lte: dayjs(endDate).endOf("day").toDate(),
          },
        }),

      // AND clause
      ...(responseFilters.length > 0 && {
        AND: responseFilters.map((fieldFilter) => {
          return makeWhereClause({
            columnName: "responseLowercase",
            filterValue: getLowercasedFilterValue(fieldFilter),
            json: { path: [fieldFilter.id, "value"] },
          });
        }),
      }),
    };

    const totalResponsePromise = prisma.routingFormResponse.count({
      where: whereClause,
    });

    const responsesPromise = prisma.routingFormResponse.findMany({
      select: {
        id: true,
        response: true,
        formId: true,
        formName: true,
        bookingUid: true,
        bookingStatus: true,
        bookingStatusOrder: true,
        bookingCreatedAt: true,
        bookingAttendees: true,
        bookingUserId: true,
        bookingUserName: true,
        bookingUserEmail: true,
        bookingUserAvatarUrl: true,
        bookingAssignmentReason: true,
        bookingStartTime: true,
        bookingEndTime: true,
        createdAt: true,
      },
      where: whereClause,
      orderBy: sorting.length > 0 ? makeOrderBy(sorting) : { createdAt: "desc" },
      take: limit ? limit + 1 : undefined, // Get one extra item to check if there are more pages
      cursor: cursor ? { id: cursor } : undefined,
    });

    const [totalResponses, responses] = await Promise.all([totalResponsePromise, responsesPromise]);

    const hasNextPage = responses.length > (limit ?? 0);
    const responsesToReturn = responses.slice(0, limit ? limit : responses.length);
    type Response = Omit<
      (typeof responsesToReturn)[number],
      "response" | "responseLowercase" | "bookingAttendees"
    > & {
      response: Record<string, ResponseValue>;
      responseLowercase: Record<string, ResponseValue>;
      bookingAttendees?: { name: string; email: string; timeZone: string }[];
    };

    return {
      total: totalResponses,
      data: responsesToReturn as Response[],
      nextCursor: hasNextPage ? responsesToReturn[responsesToReturn.length - 1].id : undefined,
    };
  }

  static async getRoutingFormPaginatedResponsesForDownload({
    teamId,
    startDate,
    endDate,
    isAll,
    organizationId,
    routingFormId,
    cursor,
    limit,
    userId,
    memberUserIds,
    columnFilters,
    sorting,
  }: RoutingFormResponsesFilter) {
    const headersPromise = this.getRoutingFormHeaders({
      userId,
      teamId,
      isAll,
      organizationId,
      routingFormId,
    });
    const dataPromise = this.getRoutingFormPaginatedResponses({
      teamId,
      startDate,
      endDate,
      isAll,
      organizationId,
      routingFormId,
      cursor,
      userId,
      memberUserIds,
      limit,
      columnFilters,
      sorting,
    });

    const [headers, data] = await Promise.all([headersPromise, dataPromise]);

    const dataWithFlatResponse = data.data.map((item) => {
      const { bookingAttendees } = item;
      const responseParseResult = ZResponse.safeParse(item.response);
      const response = responseParseResult.success ? responseParseResult.data : {};

      const fields = (headers || []).reduce((acc, header) => {
        const id = header.id;
        if (!response[id]) {
          acc[header.label] = "";
          return acc;
        }
        if (header.type === "select") {
          acc[header.label] = header.options?.find((option) => option.id === response[id].value)?.label;
        } else if (header.type === "multiselect" && Array.isArray(response[id].value)) {
          acc[header.label] = (response[id].value as string[])
            .map((value) => header.options?.find((option) => option.id === value)?.label)
            .filter((label): label is string => label !== undefined)
            .sort()
            .join(", ");
        } else {
          acc[header.label] = response[id].value as string;
        }
        return acc;
      }, {} as Record<string, string | undefined>);

      return {
        "Response ID": item.id,
        "Form Name": item.formName,
        "Submitted At": item.createdAt.toISOString(),
        "Has Booking": item.bookingUid !== null,
        "Booking Status": item.bookingStatus || "NO_BOOKING",
        "Booking Created At": item.bookingCreatedAt?.toISOString() || "",
        "Booking Start Time": item.bookingStartTime?.toISOString() || "",
        "Booking End Time": item.bookingEndTime?.toISOString() || "",
        "Attendee Name": (bookingAttendees as any)?.[0]?.name,
        "Attendee Email": (bookingAttendees as any)?.[0]?.email,
        "Attendee Timezone": (bookingAttendees as any)?.[0]?.timeZone,
        "Assignment Reason": item.bookingAssignmentReason || "",
        "Routed To Name": item.bookingUserName || "",
        "Routed To Email": item.bookingUserEmail || "",
        ...mapKeys(fields, (_, key) => startCase(key)),
      };
    });

    return {
      data: dataWithFlatResponse,
      nextCursor: data.nextCursor,
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

    // @ts-expect-error it doest exist but TS isnt smart enough when its unmber or int filter
    if (formsWhereCondition.teamId?.in) {
      // @ts-expect-error it doest exist but TS isnt smart enough when its unmber or int filter
      teamConditions.push(`f."teamId" IN (${formsWhereCondition.teamId.in.join(",")})`);
    }
    // @ts-expect-error it doest exist but TS isnt smart enough when its unmber or int filter
    if (!formsWhereCondition.teamId?.in && userId) {
      teamConditions.push(`f."userId" = ${userId}`);
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
    const headers = fields?.map((f) => {
      return {
        id: f.id,
        label: f.label,
        type: f.type,
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
    memberUserId,
    bookingStatus,
    fieldFilter,
    take,
    skip,
  }: Omit<RoutingFormInsightsFilter, "columnFilters"> & { take?: number; skip?: number }) {
    const formsWhereCondition = await this.getWhereForTeamOrAllTeams({
      userId,
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
      ...(memberUserId || bookingStatus
        ? {
            ...(bookingStatus === "NO_BOOKING"
              ? { routedToBooking: null }
              : {
                  routedToBooking: {
                    ...(memberUserId && { userId: memberUserId }),
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

  static async routedToPerPeriod({
    userId,
    teamId,
    isAll,
    organizationId,
    routingFormId,
    startDate: _startDate,
    endDate: _endDate,
    period,
    cursor,
    userCursor,
    limit = 10,
    searchQuery,
  }: RoutingFormInsightsTeamFilter & {
    period: "perDay" | "perWeek" | "perMonth";
    startDate: string;
    endDate: string;
    cursor?: string;
    userCursor?: number;
    limit?: number;
    searchQuery?: string;
  }) {
    const dayJsPeriodMap = {
      perDay: "day",
      perWeek: "week",
      perMonth: "month",
    } as const;

    const dayjsPeriod = dayJsPeriodMap[period];
    const startDate = dayjs(_startDate).startOf(dayjsPeriod).toDate();
    const endDate = dayjs(_endDate).endOf(dayjsPeriod).toDate();

    // Build the team conditions for the WHERE clause
    const formsWhereCondition = await this.getWhereForTeamOrAllTeams({
      userId,
      teamId,
      isAll,
      organizationId,
      routingFormId,
    });

    const teamConditions = [];

    // @ts-expect-error it does exist but TS isn't smart enough when it's number or int filter
    if (formsWhereCondition.teamId?.in) {
      // @ts-expect-error same as above
      teamConditions.push(`f."teamId" IN (${formsWhereCondition.teamId.in.join(",")})`);
    }
    // @ts-expect-error it does exist but TS isn't smart enough when it's number or int filter
    if (!formsWhereCondition.teamId?.in && userId) {
      teamConditions.push(`f."userId" = ${userId}`);
    }
    if (routingFormId) {
      teamConditions.push(`f.id = '${routingFormId}'`);
    }

    const searchCondition = searchQuery
      ? Prisma.sql`AND (u.name ILIKE ${`%${searchQuery}%`} OR u.email ILIKE ${`%${searchQuery}%`})`
      : Prisma.empty;

    const whereClause = teamConditions.length
      ? Prisma.sql`AND ${Prisma.raw(teamConditions.join(" AND "))}`
      : Prisma.empty;

    // Get users who have been routed to during the period
    const usersQuery = await prisma.$queryRaw<
      Array<{
        id: number;
        name: string | null;
        email: string;
        avatarUrl: string | null;
      }>
    >`
      WITH routed_responses AS (
        SELECT DISTINCT ON (b."userId")
          b."userId",
          u.id,
          u.name,
          u.email,
          u."avatarUrl"
        FROM "App_RoutingForms_FormResponse" r
        JOIN "App_RoutingForms_Form" f ON r."formId" = f.id
        JOIN "Booking" b ON r."routedToBookingUid" = b.uid
        JOIN "users" u ON b."userId" = u.id
        WHERE r."routedToBookingUid" IS NOT NULL
        AND r."createdAt" >= ${startDate}
        AND r."createdAt" <= ${endDate}
        ${searchCondition}
        ${whereClause}
        ${userCursor ? Prisma.sql`AND b."userId" > ${userCursor}` : Prisma.empty}
        ORDER BY b."userId", r."createdAt" DESC
      )
      SELECT *
      FROM routed_responses
      ORDER BY id ASC
      LIMIT ${limit}
    `;

    const users = usersQuery;

    const hasMoreUsers = users.length === limit;

    // Return early if no users found
    if (users.length === 0) {
      return {
        users: {
          data: [],
          nextCursor: undefined,
        },
        periodStats: {
          data: [],
          nextCursor: undefined,
        },
      };
    }

    // Get periods with pagination
    const periodStats = await prisma.$queryRaw<
      Array<{
        userId: number;
        period_start: Date;
        total: number;
      }>
    >`
      -- First, generate all months in the range
      WITH RECURSIVE date_range AS (
        SELECT date_trunc(${dayjsPeriod}, ${startDate}::timestamp) as date
        UNION ALL
        SELECT date + (CASE
          WHEN ${dayjsPeriod} = 'day' THEN interval '1 day'
          WHEN ${dayjsPeriod} = 'week' THEN interval '1 week'
          WHEN ${dayjsPeriod} = 'month' THEN interval '1 month'
        END)
        FROM date_range
        WHERE date < date_trunc(${dayjsPeriod}, ${endDate}::timestamp + interval '1 day')
      ),
      -- Get all unique users we want to show
      all_users AS (
        SELECT unnest(ARRAY[${Prisma.join(users.map((u) => u.id))}]) as user_id
      ),
      -- Get periods with pagination
      paginated_periods AS (
        SELECT date as period_start
        FROM date_range
        ORDER BY date ASC
        ${cursor ? Prisma.sql`OFFSET ${parseInt(cursor, 10)}` : Prisma.empty}
        LIMIT ${limit}
      ),
      -- Generate combinations for paginated periods
      date_user_combinations AS (
        SELECT
          period_start,
          user_id as "userId"
        FROM paginated_periods
        CROSS JOIN all_users
      ),
      -- Count bookings per user per period
      booking_counts AS (
        SELECT
          b."userId",
          date_trunc(${dayjsPeriod}, b."createdAt") as period_start,
          COUNT(DISTINCT b.id)::integer as total
        FROM "Booking" b
        JOIN "App_RoutingForms_FormResponse" r ON r."routedToBookingUid" = b.uid
        JOIN "App_RoutingForms_Form" f ON r."formId" = f.id
        WHERE b."userId" IN (SELECT user_id FROM all_users)
        AND date_trunc(${dayjsPeriod}, b."createdAt") >= (SELECT MIN(period_start) FROM paginated_periods)
        AND date_trunc(${dayjsPeriod}, b."createdAt") <= (SELECT MAX(period_start) FROM paginated_periods)
        ${whereClause}
        GROUP BY 1, 2
      )
      -- Join everything together
      SELECT
        c."userId",
        c.period_start,
        COALESCE(b.total, 0)::integer as total
      FROM date_user_combinations c
      LEFT JOIN booking_counts b ON
        b."userId" = c."userId" AND
        b.period_start = c.period_start
      ORDER BY c.period_start ASC, c."userId" ASC
    `;

    // Get total number of periods to determine if there are more
    const totalPeriodsQuery = await prisma.$queryRaw<[{ count: number }]>`
      WITH RECURSIVE date_range AS (
        SELECT date_trunc(${dayjsPeriod}, ${startDate}::timestamp) as date
        UNION ALL
        SELECT date + (CASE
          WHEN ${dayjsPeriod} = 'day' THEN interval '1 day'
          WHEN ${dayjsPeriod} = 'week' THEN interval '1 week'
          WHEN ${dayjsPeriod} = 'month' THEN interval '1 month'
        END)
        FROM date_range
        WHERE date < date_trunc(${dayjsPeriod}, ${endDate}::timestamp + interval '1 day')
      )
      SELECT COUNT(*)::integer as count FROM date_range
    `;

    // Get statistics for the entire period for comparison
    const statsQuery = await prisma.$queryRaw<
      Array<{
        userId: number;
        total_bookings: number;
      }>
    >`
      SELECT
        b."userId",
        COUNT(*)::integer as total_bookings
      FROM "App_RoutingForms_FormResponse" r
      JOIN "App_RoutingForms_Form" f ON r."formId" = f.id
      JOIN "Booking" b ON r."routedToBookingUid" = b.uid
      WHERE r."routedToBookingUid" IS NOT NULL
      AND r."createdAt" >= ${startDate}
      AND r."createdAt" <= ${endDate}
      ${whereClause}
      GROUP BY b."userId"
      ORDER BY total_bookings ASC
    `;

    // Calculate average and median
    const average =
      statsQuery.reduce((sum, stat) => sum + Number(stat.total_bookings), 0) / statsQuery.length || 0;
    const median = statsQuery[Math.floor(statsQuery.length / 2)]?.total_bookings || 0;

    // Create a map of user performance indicators
    const userPerformance = statsQuery.reduce((acc, stat) => {
      acc[stat.userId] = {
        total: stat.total_bookings,
        performance:
          stat.total_bookings > average
            ? "above_average"
            : stat.total_bookings === median
            ? "median"
            : stat.total_bookings < average
            ? "below_average"
            : "at_average",
      };
      return acc;
    }, {} as Record<number, { total: number; performance: "above_average" | "at_average" | "below_average" | "median" }>);

    const totalPeriods = totalPeriodsQuery[0].count;
    const currentPeriodOffset = cursor ? parseInt(cursor, 10) : 0;
    const hasMorePeriods = currentPeriodOffset + limit < totalPeriods;

    return {
      users: {
        data: users.map((user) => ({
          ...user,
          performance: userPerformance[user.id]?.performance || "no_data",
          totalBookings: userPerformance[user.id]?.total || 0,
        })),
        nextCursor: hasMoreUsers ? users[users.length - 1].id : undefined,
      },
      periodStats: {
        data: periodStats,
        nextCursor: hasMorePeriods ? (currentPeriodOffset + limit).toString() : undefined,
      },
    };
  }

  static async routedToPerPeriodCsv({
    userId,
    teamId,
    isAll,
    organizationId,
    routingFormId,
    startDate: _startDate,
    endDate: _endDate,
    period,
    searchQuery,
  }: RoutingFormInsightsTeamFilter & {
    period: "perDay" | "perWeek" | "perMonth";
    startDate: string;
    endDate: string;
    searchQuery?: string;
  }) {
    const dayJsPeriodMap = {
      perDay: "day",
      perWeek: "week",
      perMonth: "month",
    } as const;

    const dayjsPeriod = dayJsPeriodMap[period];
    const startDate = dayjs(_startDate).startOf(dayjsPeriod).toDate();
    const endDate = dayjs(_endDate).endOf(dayjsPeriod).toDate();

    // Build the team conditions for the WHERE clause
    const formsWhereCondition = await this.getWhereForTeamOrAllTeams({
      userId,
      teamId,
      isAll,
      organizationId,
      routingFormId,
    });

    const teamConditions = [];

    // @ts-expect-error it does exist but TS isn't smart enough when it's number or int filter
    if (formsWhereCondition.teamId?.in) {
      // @ts-expect-error same as above
      teamConditions.push(`f."teamId" IN (${formsWhereCondition.teamId.in.join(",")})`);
    }
    // @ts-expect-error it does exist but TS isn't smart enough when it's number or int filter
    if (!formsWhereCondition.teamId?.in && userId) {
      teamConditions.push(`f."userId" = ${userId}`);
    }
    if (routingFormId) {
      teamConditions.push(`f.id = '${routingFormId}'`);
    }

    const searchCondition = searchQuery
      ? Prisma.sql`AND (u.name ILIKE ${`%${searchQuery}%`} OR u.email ILIKE ${`%${searchQuery}%`})`
      : Prisma.empty;

    const whereClause = teamConditions.length
      ? Prisma.sql`AND ${Prisma.raw(teamConditions.join(" AND "))}`
      : Prisma.empty;

    // Get users who have been routed to during the period
    const usersQuery = await prisma.$queryRaw<
      Array<{
        id: number;
        name: string | null;
        email: string;
        avatarUrl: string | null;
      }>
    >`
      WITH routed_responses AS (
        SELECT DISTINCT ON (b."userId")
          b."userId",
          u.id,
          u.name,
          u.email,
          u."avatarUrl"
        FROM "App_RoutingForms_FormResponse" r
        JOIN "App_RoutingForms_Form" f ON r."formId" = f.id
        JOIN "Booking" b ON r."routedToBookingUid" = b.uid
        JOIN "users" u ON b."userId" = u.id
        WHERE r."routedToBookingUid" IS NOT NULL
        AND r."createdAt" >= ${startDate}
        AND r."createdAt" <= ${endDate}
        ${searchCondition}
        ${whereClause}
        ORDER BY b."userId", r."createdAt" DESC
      )
      SELECT *
      FROM routed_responses
      ORDER BY id ASC
    `;

    // Get all periods without pagination
    const periodStats = await prisma.$queryRaw<
      Array<{
        userId: number;
        period_start: Date;
        total: number;
      }>
    >`
      WITH RECURSIVE date_range AS (
        SELECT date_trunc(${dayjsPeriod}, ${startDate}::timestamp) as date
        UNION ALL
        SELECT date + (CASE
          WHEN ${dayjsPeriod} = 'day' THEN interval '1 day'
          WHEN ${dayjsPeriod} = 'week' THEN interval '1 week'
          WHEN ${dayjsPeriod} = 'month' THEN interval '1 month'
        END)
        FROM date_range
        WHERE date < date_trunc(${dayjsPeriod}, ${endDate}::timestamp + interval '1 day')
      ),
      all_users AS (
        SELECT unnest(ARRAY[${Prisma.join(usersQuery.map((u) => u.id))}]) as user_id
      ),
      date_user_combinations AS (
        SELECT
          date as period_start,
          user_id as "userId"
        FROM date_range
        CROSS JOIN all_users
      ),
      booking_counts AS (
        SELECT
          b."userId",
          date_trunc(${dayjsPeriod}, b."createdAt") as period_start,
          COUNT(DISTINCT b.id)::integer as total
        FROM "Booking" b
        JOIN "App_RoutingForms_FormResponse" r ON r."routedToBookingUid" = b.uid
        JOIN "App_RoutingForms_Form" f ON r."formId" = f.id
        WHERE b."userId" IN (SELECT user_id FROM all_users)
        AND date_trunc(${dayjsPeriod}, b."createdAt") >= (SELECT MIN(date) FROM date_range)
        AND date_trunc(${dayjsPeriod}, b."createdAt") <= (SELECT MAX(date) FROM date_range)
        ${whereClause}
        GROUP BY 1, 2
      )
      SELECT
        c."userId",
        c.period_start,
        COALESCE(b.total, 0)::integer as total
      FROM date_user_combinations c
      LEFT JOIN booking_counts b ON
        b."userId" = c."userId" AND
        b.period_start = c.period_start
      ORDER BY c.period_start ASC, c."userId" ASC
    `;

    // Get statistics for the entire period for comparison
    const statsQuery = await prisma.$queryRaw<
      Array<{
        userId: number;
        total_bookings: number;
      }>
    >`
      SELECT
        b."userId",
        COUNT(*)::integer as total_bookings
      FROM "App_RoutingForms_FormResponse" r
      JOIN "App_RoutingForms_Form" f ON r."formId" = f.id
      JOIN "Booking" b ON r."routedToBookingUid" = b.uid
      WHERE r."routedToBookingUid" IS NOT NULL
      AND r."createdAt" >= ${startDate}
      AND r."createdAt" <= ${endDate}
      ${whereClause}
      GROUP BY b."userId"
      ORDER BY total_bookings ASC
    `;

    // Calculate average and median
    const average =
      statsQuery.reduce((sum, stat) => sum + Number(stat.total_bookings), 0) / statsQuery.length || 0;
    const median = statsQuery[Math.floor(statsQuery.length / 2)]?.total_bookings || 0;

    // Create a map of user performance indicators
    const userPerformance = statsQuery.reduce((acc, stat) => {
      acc[stat.userId] = {
        total: stat.total_bookings,
        performance:
          stat.total_bookings > average
            ? "above_average"
            : stat.total_bookings === median
            ? "median"
            : stat.total_bookings < average
            ? "below_average"
            : "at_average",
      };
      return acc;
    }, {} as Record<number, { total: number; performance: "above_average" | "at_average" | "below_average" | "median" }>);

    // Group period stats by user
    const userPeriodStats = periodStats.reduce((acc, stat) => {
      if (!acc[stat.userId]) {
        acc[stat.userId] = [];
      }
      acc[stat.userId].push({
        period_start: stat.period_start,
        total: stat.total,
      });
      return acc;
    }, {} as Record<number, Array<{ period_start: Date; total: number }>>);

    // Format data for CSV
    return usersQuery.map((user) => {
      const stats = userPeriodStats[user.id] || [];
      const periodData = stats.reduce(
        (acc, stat) => ({
          ...acc,
          [`Responses ${dayjs(stat.period_start).format("YYYY-MM-DD")}`]: stat.total.toString(),
        }),
        {} as Record<string, string>
      );

      return {
        "User ID": user.id.toString(),
        Name: user.name || "",
        Email: user.email,
        "Total Bookings": (userPerformance[user.id]?.total || 0).toString(),
        Performance: userPerformance[user.id]?.performance || "no_data",
        ...periodData,
      };
    });
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
