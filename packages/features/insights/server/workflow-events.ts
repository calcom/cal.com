import { Prisma } from "@prisma/client";

// eslint-disable-next-line no-restricted-imports
import dayjs from "@calcom/dayjs";
import { readonlyPrisma as prisma } from "@calcom/prisma";

export const isIntFilter = (value: unknown): value is Prisma.IntFilter => {
  return (
    typeof value === "object" &&
    value !== null &&
    ("equals" in value ||
      "in" in value ||
      "lt" in value ||
      "lte" in value ||
      "gt" in value ||
      "gte" in value ||
      "not" in value)
  );
};

type WorkflowStatusAggregate = {
  DELIVERED: number;
  READ: number;
  FAILED: number;
  _all: number;
};

type WorkflowAggregateResult = {
  [date: string]: WorkflowStatusAggregate;
};

class WorkflowEventsInsights {
  static countGroupedWorkflowByStatusForRanges = async (
    whereConditional: Prisma.WorkflowInsightsWhereInput,
    dateRanges: {
      startDate: string;
      endDate: string;
      formattedDate: string;
    }[]
  ): Promise<WorkflowAggregateResult> => {
    // Prepare conditions from whereConditional
    const conditions: string[] = [];

    if (whereConditional.AND) {
      (whereConditional.AND as Prisma.WorkflowInsightsWhereInput[]).forEach((condition) => {
        if (condition.createdAt) {
          const dateFilter = condition.createdAt as Prisma.DateTimeFilter;
          if (dateFilter.gte) {
            conditions.push(`"createdAt" >= '${dateFilter.gte}'`);
          }
          if (dateFilter.lte) {
            conditions.push(`"createdAt" <= '${dateFilter.lte}'`);
          }
        }
        if (condition.eventTypeId) {
          if (isIntFilter(condition.eventTypeId)) {
            if (condition.eventTypeId.in && condition.eventTypeId.in.length > 0) {
              const ids = condition.eventTypeId.in.map((id: number) => `'${id}'`).join(",");
              conditions.push(`"eventTypeId" IN (${ids})`);
            } else {
              conditions.push(`FALSE`); // Prevents an invalid `IN ()` clause
            }
          } else {
            conditions.push(`"eventTypeId" = ${condition.eventTypeId}`);
          }
        }
        if (condition.type) {
          conditions.push(`"type" = '${condition.type}'`);
        }
      });
    }

    const whereClause = conditions.length > 0 ? `(${conditions.join(" AND ")})` : "TRUE";

    const data = await prisma.$queryRaw<
      {
        periodStart: Date;
        insightsCount: number;
        status: string;
      }[]
    >`
    SELECT
      "periodStart",
      CAST(COUNT(*) AS INTEGER) AS "insightsCount",
      "status"
    FROM (
      SELECT
        "createdAt" AS "periodStart",
        "status"
      FROM
        "WorkflowInsights"
      WHERE
        ${Prisma.raw(whereClause)}
    ) AS filtered_dates
    GROUP BY
      "periodStart",
      "status"
    ORDER BY
      "periodStart";
    `;

    // Initialize the aggregate object with expected date keys
    const aggregate: WorkflowAggregateResult = {};
    dateRanges.forEach(({ formattedDate }) => {
      aggregate[formattedDate] = {
        DELIVERED: 0,
        READ: 0,
        FAILED: 0,
        _all: 0,
      };
    });

    // Process fetched data and map it to the correct formattedDate
    data.forEach(({ periodStart, insightsCount, status }) => {
      const matchingRange = dateRanges.find(({ startDate, endDate }) =>
        dayjs(periodStart).isBetween(startDate, endDate, null, "[]")
      );

      if (!matchingRange) return;

      const formattedDate = matchingRange.formattedDate;
      const statusKey = status as keyof WorkflowStatusAggregate;

      aggregate[formattedDate][statusKey] += Number(insightsCount);
      aggregate[formattedDate]["_all"] += Number(insightsCount);
    });

    return aggregate;
  };
}

export { WorkflowEventsInsights };
