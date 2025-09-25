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

class CalIdWorkflowEventsInsights {
  static countGroupedWorkflowByStatusForRanges = async (
    whereConditional: Prisma.CalIdWorkflowInsightsWhereInput,
    dateRanges: { startDate: string; endDate: string }[],
    timeZone: string
  ): Promise<Record<string, WorkflowStatusAggregate>> => {
    const conditions: string[] = [];

    if (whereConditional.AND) {
      (whereConditional.AND as Prisma.CalIdWorkflowInsightsWhereInput[]).forEach((condition) => {
        if (condition.createdAt) {
          const dateFilter = condition.createdAt as Prisma.DateTimeFilter;
          if (dateFilter.gte) {
            const gte = dayjs(dateFilter.gte).tz(timeZone).format(); // normalize to TZ
            conditions.push(`"createdAt" >= '${gte}'`);
          }
          if (dateFilter.lte) {
            const lte = dayjs(dateFilter.lte).tz(timeZone).format();
            conditions.push(`"createdAt" <= '${lte}'`);
          }
        }
        if (condition.eventTypeId) {
          if (isIntFilter(condition.eventTypeId)) {
            if (condition.eventTypeId.in && condition.eventTypeId.in.length > 0) {
              const ids = condition.eventTypeId.in.map((id: number) => `'${id}'`).join(",");
              conditions.push(`"eventTypeId" IN (${ids})`);
            } else {
              conditions.push(`FALSE`);
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

    const data = await prisma.$queryRaw<{ periodStart: Date; insightsCount: number; status: string }[]>`
    SELECT
      "periodStart",
      CAST(COUNT(*) AS INTEGER) AS "insightsCount",
      "status"
    FROM (
      SELECT "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${Prisma.raw(`'${timeZone}'`)} AS "periodStart",
             "status"
      FROM "CalIdWorkflowInsights"
      WHERE ${Prisma.raw(whereClause)}
    ) AS filtered_dates
    GROUP BY "periodStart", "status"
    ORDER BY "periodStart";
  `;

    // Aggregate per range as before
    const aggregate: Record<string, WorkflowStatusAggregate> = {};
    dateRanges.forEach(({ startDate, endDate }) => {
      aggregate[`${startDate}_${endDate}`] = { DELIVERED: 0, READ: 0, FAILED: 0, _all: 0 };
    });

    data.forEach(({ periodStart, insightsCount, status }) => {
      const matchingRange = dateRanges.find(({ startDate, endDate }) =>
        dayjs(periodStart).tz(timeZone).isBetween(startDate, endDate, null, "[]")
      );
      if (!matchingRange) return;

      const key = `${matchingRange.startDate}_${matchingRange.endDate}`;
      const statusKey = status as keyof WorkflowStatusAggregate;

      aggregate[key][statusKey] += Number(insightsCount);
      aggregate[key]._all += Number(insightsCount);
    });

    return aggregate;
  };
}

export { CalIdWorkflowEventsInsights };
