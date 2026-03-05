import type { CalendarProvider } from "@calid/job-engine";
import { Prisma } from "@prisma/client";

import prisma from "@calcom/prisma";

interface CalendarIdRow {
  calendarId: number;
}

const uniqueCalendarIds = (rows: CalendarIdRow[]): number[] => {
  return [...new Set(rows.map((row) => row.calendarId))];
};

export const resolveCalendarIdsForWebhook = async (params: {
  provider: CalendarProvider;
  subscriptionId?: string | null;
  resourceId?: string | null;
  providerCalendarId?: string | null;
  providerAccountId?: string | null;
}): Promise<number[]> => {
  if (params.subscriptionId) {
    const rows = await prisma.$queryRaw<CalendarIdRow[]>(
      Prisma.sql`
        SELECT ecs."calendarId"
        FROM "ExternalCalendarSubscription" ecs
        WHERE ecs."provider" = CAST(${params.provider} AS "CalendarProvider")
          AND ecs."subscriptionId" = ${params.subscriptionId}
          AND ecs."isActive" = true
      `
    );

    const ids = uniqueCalendarIds(rows);
    if (ids.length > 0) {
      return ids;
    }
  }

  if (params.resourceId) {
    const rows = await prisma.$queryRaw<CalendarIdRow[]>(
      Prisma.sql`
        SELECT ecs."calendarId"
        FROM "ExternalCalendarSubscription" ecs
        WHERE ecs."provider" = CAST(${params.provider} AS "CalendarProvider")
          AND ecs."resourceId" = ${params.resourceId}
          AND ecs."isActive" = true
      `
    );

    const ids = uniqueCalendarIds(rows);
    if (ids.length > 0) {
      return ids;
    }
  }

  if (params.providerCalendarId) {
    if (params.providerAccountId) {
      const rows = await prisma.$queryRaw<CalendarIdRow[]>(
        Prisma.sql`
          SELECT ec."id" AS "calendarId"
          FROM "ExternalCalendar" ec
          INNER JOIN "Credential" c ON c."id" = ec."credentialId"
          WHERE ec."provider" = CAST(${params.provider} AS "CalendarProvider")
            AND ec."providerCalendarId" = ${params.providerCalendarId}
            AND ec."syncEnabled" = true
            AND (
              c."key"->>'providerAccountId' = ${params.providerAccountId}
              OR c."key"->>'account_id' = ${params.providerAccountId}
              OR c."key"->>'tenantId' = ${params.providerAccountId}
              OR c."key"->>'tenant_id' = ${params.providerAccountId}
            )
        `
      );

      const ids = uniqueCalendarIds(rows);
      if (ids.length > 0) {
        return ids;
      }
    }

    const rows = await prisma.$queryRaw<CalendarIdRow[]>(
      Prisma.sql`
        SELECT ec."id" AS "calendarId"
        FROM "ExternalCalendar" ec
        WHERE ec."provider" = CAST(${params.provider} AS "CalendarProvider")
          AND ec."providerCalendarId" = ${params.providerCalendarId}
          AND ec."syncEnabled" = true
      `
    );

    return uniqueCalendarIds(rows);
  }

  void params.providerAccountId;
  return [];
};
