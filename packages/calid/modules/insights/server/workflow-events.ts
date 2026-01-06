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
  QUEUED: number;
  CANCELLED: number;
  SENT: number;
  _all: number;
};

const normalizeTimeZone = (tz: string) => {
  if (tz === "Asia/Calcutta") return "Asia/Kolkata";
  return tz;
};

class CalIdWorkflowEventsInsights {
  static countGroupedWorkflowByStatusForRanges = async (
    insightsWhereConditional: Prisma.CalIdWorkflowInsightsWhereInput,
    remindersWhereConditions: Prisma.CalIdWorkflowReminderWhereInput[],
    dateRanges: { startDate: string; endDate: string }[],
    timeZone: string,
    eventTypeId?: number,
    eventTypeIds?: number[]
  ): Promise<Record<string, WorkflowStatusAggregate>> => {
    const insightsConditions: string[] = [];

    // Build insights conditions
    if (insightsWhereConditional.AND) {
      (insightsWhereConditional.AND as Prisma.CalIdWorkflowInsightsWhereInput[]).forEach((condition) => {
        if (condition.createdAt) {
          const dateFilter = condition.createdAt as Prisma.DateTimeFilter;
          if (dateFilter.gte) {
            const gte = dayjs(dateFilter.gte).tz(timeZone).format();
            insightsConditions.push(`"createdAt" >= '${gte}'`);
          }
          if (dateFilter.lte) {
            const lte = dayjs(dateFilter.lte).tz(timeZone).format();
            insightsConditions.push(`"createdAt" <= '${lte}'`);
          }
        }
        if (condition.eventTypeId) {
          if (isIntFilter(condition.eventTypeId)) {
            if (condition.eventTypeId.in && condition.eventTypeId.in.length > 0) {
              const ids = condition.eventTypeId.in.map((id: number) => `'${id}'`).join(",");
              insightsConditions.push(`"eventTypeId" IN (${ids})`);
            } else {
              insightsConditions.push(`FALSE`);
            }
          } else {
            insightsConditions.push(`"eventTypeId" = ${condition.eventTypeId}`);
          }
        }
        if (condition.type) {
          insightsConditions.push(`"type" = '${condition.type}'`);
        }
        if (condition.workflowStepId) {
          insightsConditions.push(`"workflowStepId" IS NOT NULL`);
        }
      });
    }

    const insightsWhereClause =
      insightsConditions.length > 0 ? `(${insightsConditions.join(" AND ")})` : "TRUE";

    // Build reminders conditions
    const remindersConditions: string[] = [];
    remindersWhereConditions.forEach((condition) => {
      if (condition.scheduledDate) {
        const dateFilter = condition.scheduledDate as Prisma.DateTimeFilter;
        if (dateFilter.gte) {
          const gte = dayjs(dateFilter.gte).tz(timeZone).format();
          remindersConditions.push(`"scheduledDate" >= '${gte}'`);
        }
        if (dateFilter.lte) {
          const lte = dayjs(dateFilter.lte).tz(timeZone).format();
          remindersConditions.push(`"scheduledDate" <= '${lte}'`);
        }
      }
      if (condition.method) {
        remindersConditions.push(`"method" = '${condition.method}'`);
      }
      if (condition.workflowStepId) {
        remindersConditions.push(`"workflowStepId" IS NOT NULL`);
      }
    });

    // Add eventType filtering for reminders via booking join
    if (eventTypeId) {
      remindersConditions.push(`b."eventTypeId" = ${eventTypeId}`);
    } else if (eventTypeIds && eventTypeIds.length > 0) {
      const ids = eventTypeIds.map((id: number) => `'${id}'`).join(",");
      remindersConditions.push(`b."eventTypeId" IN (${ids})`);
    }

    const remindersWhereClause =
      remindersConditions.length > 0 ? `(${remindersConditions.join(" AND ")})` : "TRUE";

    const safeTimeZone = normalizeTimeZone(timeZone);

    // Fetch insights data with identifying information
    const insightsData = await prisma.$queryRaw<
      {
        periodStart: Date;
        insightsCount: number;
        status: string;
        bookingUid: string;
        workflowStepId: number;
        bookingSeatReferenceUid: string | null;
      }[]
    >`
    SELECT
      "periodStart",
      CAST(COUNT(*) AS INTEGER) AS "insightsCount",
      "status",
      "bookingUid",
      "workflowStepId",
      "bookingSeatReferenceUid"
    FROM (
      SELECT 
        "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${safeTimeZone} AS "periodStart",
        "status",
        "bookingUid",
        "workflowStepId",
        "bookingSeatReferenceUid"
      FROM "CalIdWorkflowInsights"
      WHERE ${Prisma.raw(insightsWhereClause)}
    ) AS filtered_dates
    GROUP BY "periodStart", "status", "bookingUid", "workflowStepId", "bookingSeatReferenceUid"
    ORDER BY "periodStart";
  `;

    // Fetch reminders data with identifying information
    const remindersData = await prisma.$queryRaw<
      {
        periodStart: Date;
        remindersCount: number;
        cancelled: boolean;
        scheduled: boolean;
        bookingUid: string;
        workflowStepId: number;
        seatReferenceId: string | null;
      }[]
    >`
    SELECT
      "periodStart",
      CAST(COUNT(*) AS INTEGER) AS "remindersCount",
      "cancelled",
      "scheduled",
      "bookingUid",
      "workflowStepId",
      "seatReferenceId"
    FROM (
      SELECT 
        r."scheduledDate" AT TIME ZONE 'UTC' AT TIME ZONE ${safeTimeZone} AS "periodStart",
        r."cancelled",
        r."scheduled",
        r."workflowStepId",
        r."bookingUid",
        r."seatReferenceId"
      FROM "CalIdWorkflowReminder" r
      INNER JOIN "Booking" b ON r."bookingUid" = b."uid"
      WHERE ${Prisma.raw(remindersWhereClause)}
    ) AS filtered_reminders
    GROUP BY "periodStart", "cancelled", "scheduled", "bookingUid", "workflowStepId", "seatReferenceId"
    ORDER BY "periodStart";
  `;

    // Create a set of processed insights using composite keys
    const processedInsightKeys = new Set<string>();

    // Initialize aggregate
    const aggregate: Record<string, WorkflowStatusAggregate> = {};
    dateRanges.forEach(({ startDate, endDate }) => {
      aggregate[`${startDate}_${endDate}`] = {
        DELIVERED: 0,
        READ: 0,
        FAILED: 0,
        QUEUED: 0,
        CANCELLED: 0,
        SENT: 0,
        _all: 0,
      };
    });

    // Process insights data
    insightsData.forEach(
      ({ periodStart, insightsCount, status, bookingUid, workflowStepId, bookingSeatReferenceUid }) => {
        const matchingRange = dateRanges.find(({ startDate, endDate }) =>
          dayjs(periodStart).tz(timeZone).isBetween(startDate, endDate, null, "[]")
        );
        if (!matchingRange) return;

        const key = `${matchingRange.startDate}_${matchingRange.endDate}`;
        const statusKey = status as keyof WorkflowStatusAggregate;

        // Create composite key to track this specific insight
        const insightKey = `${bookingUid}-${workflowStepId}-${bookingSeatReferenceUid || "booking"}`;
        processedInsightKeys.add(insightKey);

        if (statusKey === "DELIVERED" || statusKey === "SENT") {
          aggregate[key].DELIVERED += Number(insightsCount);
        } else if (aggregate[key].hasOwnProperty(statusKey)) {
          aggregate[key][statusKey] += Number(insightsCount);
        }
        aggregate[key]._all += Number(insightsCount);
      }
    );

    // Process reminders data (only those without corresponding insights)
    remindersData.forEach(
      ({
        periodStart,
        remindersCount,
        cancelled,
        scheduled,
        bookingUid,
        workflowStepId,
        seatReferenceId,
      }) => {
        const matchingRange = dateRanges.find(({ startDate, endDate }) =>
          dayjs(periodStart).tz(timeZone).isBetween(startDate, endDate, null, "[]")
        );
        if (!matchingRange) return;

        // Create composite key to check if this reminder has a corresponding insight
        const reminderKey = `${bookingUid}-${workflowStepId}-${seatReferenceId || "booking"}`;

        // Skip if this reminder already has a corresponding insight
        if (processedInsightKeys.has(reminderKey)) {
          return;
        }

        const key = `${matchingRange.startDate}_${matchingRange.endDate}`;

        // Determine status based on reminder state
        if (cancelled) {
          aggregate[key].CANCELLED += Number(remindersCount);
          aggregate[key]._all += Number(remindersCount);
        } else if (scheduled) {
          // Only count as QUEUED if there's no corresponding insight
          aggregate[key].QUEUED += Number(remindersCount);
          aggregate[key]._all += Number(remindersCount);
        }
      }
    );

    return aggregate;
  };
}

export { CalIdWorkflowEventsInsights };
