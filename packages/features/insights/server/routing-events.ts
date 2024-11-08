import { Prisma } from "@prisma/client";

import dayjs from "@calcom/dayjs";
import { readonlyPrisma as prisma } from "@calcom/prisma";

class RoutingEventsInsights {
  private static async getWhereForTeamOrAllTeams({
    teamId,
    isAll,
    organizationId,
    routingFormId,
  }: {
    teamId?: number | null;
    isAll: boolean;
    organizationId: number | null;
    routingFormId?: string | null;
  }) {
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

    console.log(JSON.stringify({ formsWhereCondition }, null, 2));

    return formsWhereCondition;
  }

  static async getRoutingFormStats({
    teamId,
    startDate,
    endDate,
    isAll = false,
    organizationId,
    routingFormId,
  }: {
    teamId: number | null;
    startDate?: string;
    endDate?: string;
    isAll: boolean;
    organizationId: number | null;
    routingFormId: string | null;
  }) {
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

  static async getRoutingFormTimeline({
    teamId,
    startDate,
    endDate,
    timeView = "week",
    isAll = false,
    organizationId,
  }: {
    teamId?: number | null;
    startDate: string;
    endDate: string;
    timeView?: "week" | "month" | "year" | "day";
    isAll?: boolean;
    organizationId?: number | null;
  }) {
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

    const formattedStartDate = dayjs(startDate).format("YYYY-MM-DD HH:mm:ss");
    const formattedEndDate = dayjs(endDate).format("YYYY-MM-DD HH:mm:ss");

    // Query to get responses grouped by time period
    const data = await prisma.$queryRaw<{ periodStart: Date; responsesCount: number; hasBooking: boolean }[]>`
      SELECT
        DATE_TRUNC(${timeView}, "createdAt") AS "periodStart",
        CAST(COUNT(*) AS INTEGER) AS "responsesCount",
        "routedToBookingUid" IS NOT NULL AS "hasBooking"
      FROM
        "App_RoutingForms_FormResponse"
      WHERE
        "createdAt" BETWEEN ${formattedStartDate}::timestamp AND ${formattedEndDate}::timestamp
        ${
          teamIds.length > 0
            ? Prisma.sql`AND "formId" IN (
              SELECT "id" FROM "App_RoutingForms_Form"
              WHERE "teamId" IN (${Prisma.join(teamIds)})
            )`
            : Prisma.empty
        }
      GROUP BY
        "periodStart",
        "hasBooking"
      ORDER BY
        "periodStart";
    `;

    return data;
  }
}

export { RoutingEventsInsights };
