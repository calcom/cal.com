import type { CalendarProvider } from "@calid/job-engine";
import { Prisma } from "@prisma/client";

import prisma from "@calcom/prisma";

export interface ResolvedWebhookCalendarTarget {
  calendarId: number;
  credentialId: number;
  providerCalendarId: string;
}

const uniqueTargets = (rows: ResolvedWebhookCalendarTarget[]): ResolvedWebhookCalendarTarget[] => {
  const deduped = new Map<number, ResolvedWebhookCalendarTarget>();
  for (const row of rows) {
    deduped.set(row.calendarId, row);
  }
  return [...deduped.values()];
};

export const resolveCalendarTargetsForWebhook = async (params: {
  provider: CalendarProvider;
  subscriptionId?: string | null;
  resourceId?: string | null;
  providerCalendarId?: string | null;
}): Promise<ResolvedWebhookCalendarTarget[]> => {
  if (params.subscriptionId) {
    const rows = await prisma.$queryRaw<ResolvedWebhookCalendarTarget[]>(
      Prisma.sql`
        SELECT
          ec."id" AS "calendarId",
          ec."credentialId",
          ec."providerCalendarId"
        FROM "ExternalCalendarSubscription" ecs
        INNER JOIN "ExternalCalendar" ec ON ec."id" = ecs."calendarId"
        WHERE ecs."provider" = CAST(${params.provider} AS "CalendarProvider")
          AND ecs."subscriptionId" = ${params.subscriptionId}
          AND ecs."isActive" = true
          AND ec."syncEnabled" = true
      `
    );

    const targets = uniqueTargets(rows);
    if (targets.length > 0) {
      return targets;
    }
  }

  if (params.resourceId) {
    const rows = await prisma.$queryRaw<ResolvedWebhookCalendarTarget[]>(
      Prisma.sql`
        SELECT
          ec."id" AS "calendarId",
          ec."credentialId",
          ec."providerCalendarId"
        FROM "ExternalCalendarSubscription" ecs
        INNER JOIN "ExternalCalendar" ec ON ec."id" = ecs."calendarId"
        WHERE ecs."provider" = CAST(${params.provider} AS "CalendarProvider")
          AND ecs."resourceId" = ${params.resourceId}
          AND ecs."isActive" = true
          AND ec."syncEnabled" = true
      `
    );

    const targets = uniqueTargets(rows);
    if (targets.length > 0) {
      return targets;
    }
  }

  if (!params.providerCalendarId) {
    return [];
  }

  const rows = await prisma.$queryRaw<ResolvedWebhookCalendarTarget[]>(
    Prisma.sql`
      SELECT
        ec."id" AS "calendarId",
        ec."credentialId",
        ec."providerCalendarId"
      FROM "ExternalCalendar" ec
      WHERE ec."provider" = CAST(${params.provider} AS "CalendarProvider")
        AND ec."providerCalendarId" = ${params.providerCalendarId}
        AND ec."syncEnabled" = true
    `
  );

  return uniqueTargets(rows);
};
