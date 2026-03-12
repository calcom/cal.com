import { buildJobId, dispatcher, JobName } from "@calid/job-dispatcher";
import type { CalendarSyncJobData } from "@calid/job-engine";
import { QueueName } from "@calid/queue";

import { Prisma } from "@calcom/prisma/client";
import type { PrismaClient } from "@calcom/prisma/client";

interface SyncedCalendarRow {
  externalCalendarId: number;
  provider: string;
  credentialId: number;
  providerCalendarId: string;
}

const toProviderSlug = (provider: "GOOGLE" | "OUTLOOK"): "google" | "outlook" =>
  provider === "GOOGLE" ? "google" : "outlook";

const isCalendarProvider = (provider: string): provider is "GOOGLE" | "OUTLOOK" =>
  provider === "GOOGLE" || provider === "OUTLOOK";

export const disableSyncedCalendarsOnDisconnect = async (params: {
  prisma: PrismaClient;
  credentialId: number;
  userId?: number;
  teamId?: number;
}): Promise<{ disabledCount: number; enqueuedCount: number }> => {
  const scopePredicates: Prisma.Sql[] = [];
  if (typeof params.userId === "number") {
    scopePredicates.push(Prisma.sql`c."userId" = ${params.userId}`);
  }
  if (typeof params.teamId === "number") {
    scopePredicates.push(Prisma.sql`c."teamId" = ${params.teamId}`);
    scopePredicates.push(Prisma.sql`c."calIdTeamId" = ${params.teamId}`);
  }
  if (scopePredicates.length === 0) {
    return { disabledCount: 0, enqueuedCount: 0 };
  }

  const rows = await params.prisma.$queryRaw<SyncedCalendarRow[]>(
    Prisma.sql`
      SELECT
        ec."id" AS "externalCalendarId",
        ec."provider"::text AS "provider",
        ec."credentialId",
        ec."providerCalendarId"
      FROM "ExternalCalendar" ec
      INNER JOIN "Credential" c ON c."id" = ec."credentialId"
      WHERE ec."credentialId" = ${params.credentialId}
        AND ec."syncEnabled" = true
        AND (${Prisma.join(scopePredicates, " OR ")})
    `
  );

  if (rows.length === 0) {
    return { disabledCount: 0, enqueuedCount: 0 };
  }

  const now = new Date();
  const calendarIds = rows.map((row) => row.externalCalendarId);
  await params.prisma.$executeRaw(
    Prisma.sql`
      UPDATE "ExternalCalendar"
      SET
        "syncEnabled" = false,
        "syncStatus" = CAST(${"IDLE"} AS "CalendarSyncStatus"),
        "syncDisabledReason" = CAST(${"USER_DISCONNECTED"} AS "CalendarSyncDisabledReason"),
        "syncDisabledBy" = CAST(${"USER"} AS "CalendarSyncDisabledBy"),
        "syncDisabledAt" = ${now},
        "updatedAt" = NOW()
      WHERE "id" IN (${Prisma.join(calendarIds)})
    `
  );

  let enqueuedCount = 0;
  await Promise.all(
    rows.map(async (row) => {
      if (!isCalendarProvider(row.provider)) {
        return;
      }
      const provider = toProviderSlug(row.provider);
      const payload: CalendarSyncJobData = {
        name: JobName.CALENDAR_SYNC,
        action: "disableCalendarSync",
        calendarId: row.externalCalendarId,
        provider,
        credentialId: row.credentialId,
        providerCalendarId: row.providerCalendarId,
        reason: "manual",
        disableReason: "user",
        syncDisabledReason: "USER_DISCONNECTED",
      };

      try {
        await dispatcher.dispatch({
          queue: QueueName.DATA_SYNC,
          name: JobName.CALENDAR_SYNC,
          data: payload,
          bullmqOptions: {
            jobId: buildJobId([
              "calendarSync",
              "disableSync",
              provider,
              row.credentialId,
              row.providerCalendarId,
              row.externalCalendarId,
            ]),
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 2000,
            },
            removeOnComplete: {
              age: 3600,
              count: 1000,
            },
            removeOnFail: {
              age: 86400,
              count: 2000,
            },
          },
        });
        enqueuedCount += 1;
      } catch {
        // Best effort enqueue to keep disconnect path fast and resilient.
      }
    })
  );

  return {
    disabledCount: rows.length,
    enqueuedCount,
  };
};
