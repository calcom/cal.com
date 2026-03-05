import { dispatcher, JobName } from "@calid/job-dispatcher";
import type { CalendarSyncJobData } from "@calid/job-engine";
import { QueueName } from "@calid/queue";

import logger from "@calcom/lib/logger";
import { Prisma } from "@calcom/prisma/client";

import { TRPCError } from "@trpc/server";

import type { TRPCContext } from "../../../createContext";
import type { TToggleCalendarSyncInput, TToggleCalendarSyncOutput } from "./toggleCalendarSync.schema";

interface CalendarOwnershipRow {
  externalCalendarId: number;
  syncEnabled: boolean;
}

const log = logger.getSubLogger({ prefix: ["viewer", "unifiedCalendar", "toggleSync"] });

const toProviderSlug = (provider: "GOOGLE" | "OUTLOOK"): "google" | "outlook" =>
  provider === "GOOGLE" ? "google" : "outlook";

const sanitizeProviderAccountId = (providerAccountId: string): string =>
  providerAccountId.replace(/[^a-zA-Z0-9_-]/g, "_");

const findCalendarOwnedByUser = async (params: {
  ctx: TRPCContext;
  userId: number;
  provider: "GOOGLE" | "OUTLOOK";
  providerAccountId: string;
  providerCalendarId: string;
}): Promise<CalendarOwnershipRow | null> => {
  const rows = await params.ctx.prisma.$queryRaw<CalendarOwnershipRow[]>(
    Prisma.sql`
      SELECT
        ec."id" AS "externalCalendarId",
        ec."syncEnabled"
      FROM "ExternalCalendar" ec
      INNER JOIN "Credential" c ON c."id" = ec."credentialId"
      WHERE c."userId" = ${params.userId}
        AND ec."provider" = CAST(${params.provider} AS "CalendarProvider")
        AND ec."providerCalendarId" = ${params.providerCalendarId}
        AND COALESCE(
          c."key"->>'providerAccountId',
          c."key"->>'provider_account_id',
          c."key"->>'accountId',
          c."key"->>'account_id',
          c."key"->>'tenantId',
          c."key"->>'tenant_id',
          c."key"->>'sub',
          c."key"->>'oid',
          c."key"->>'email'
        ) = ${params.providerAccountId}
      LIMIT 1
    `
  );

  return rows[0] ?? null;
};

const updateSyncEnabled = async (params: {
  ctx: TRPCContext;
  externalCalendarId: number;
  enabled: boolean;
  syncDisabledReason?: "USER_DISCONNECTED" | "USER_TOGGLED_OFF" | "SUBSCRIPTION_RENEWAL_FAILED" | null;
  syncDisabledBy?: "USER" | "SYSTEM" | null;
  syncDisabledAt?: Date | null;
}) => {
  await params.ctx.prisma.$executeRaw(
    Prisma.sql`
      UPDATE "ExternalCalendar"
      SET
        "syncEnabled" = ${params.enabled},
        "syncStatus" = CAST(${"IDLE"} AS "CalendarSyncStatus"),
        "syncDisabledReason" = ${
          params.syncDisabledReason
            ? Prisma.sql`CAST(${params.syncDisabledReason} AS "CalendarSyncDisabledReason")`
            : Prisma.sql`NULL`
        },
        "syncDisabledBy" = ${
          params.syncDisabledBy
            ? Prisma.sql`CAST(${params.syncDisabledBy} AS "CalendarSyncDisabledBy")`
            : Prisma.sql`NULL`
        },
        "syncDisabledAt" = ${params.syncDisabledAt ?? null},
        "updatedAt" = NOW()
      WHERE "id" = ${params.externalCalendarId}
    `
  );
};

const enqueueCalendarSyncAction = async (params: {
  externalCalendarId: number;
  provider: "GOOGLE" | "OUTLOOK";
  providerAccountId: string;
  enabled: boolean;
}): Promise<void> => {
  const bucket = Math.floor(Date.now() / 15_000);
  const providerSlug = toProviderSlug(params.provider);
  const providerAccountId = sanitizeProviderAccountId(params.providerAccountId);

  const payload: CalendarSyncJobData = {
    name: JobName.CALENDAR_SYNC,
    action: params.enabled ? "initialSync" : "disableCalendarSync",
    calendarId: params.externalCalendarId,
    provider: providerSlug,
    providerAccountId,
    reason: "manual",
    disableReason: params.enabled ? undefined : "user",
    syncDisabledReason: params.enabled ? undefined : "USER_TOGGLED_OFF",
  };

  await dispatcher.dispatch({
    queue: QueueName.DATA_SYNC,
    name: JobName.CALENDAR_SYNC,
    data: payload,
    bullmqOptions: {
      jobId: `${params.enabled ? "initialSync" : "disableSync"}:${params.externalCalendarId}:${bucket}`,
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
};

export const toggleCalendarSyncHandler = async ({
  ctx,
  input,
}: {
  ctx: TRPCContext;
  input: TToggleCalendarSyncInput;
}): Promise<TToggleCalendarSyncOutput> => {
  const userId = ctx.user?.id;
  if (!userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }

  const calendarRow = await findCalendarOwnedByUser({
    ctx,
    userId,
    provider: input.provider,
    providerAccountId: input.providerAccountId,
    providerCalendarId: input.calendarId,
  });

  if (!calendarRow) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Calendar not found",
    });
  }

  if (calendarRow.syncEnabled === input.enabled) {
    return { enabled: input.enabled, enqueued: false };
  }

  await updateSyncEnabled({
    ctx,
    externalCalendarId: calendarRow.externalCalendarId,
    enabled: input.enabled,
    syncDisabledReason: input.enabled ? null : "USER_TOGGLED_OFF",
    syncDisabledBy: input.enabled ? null : "USER",
    syncDisabledAt: input.enabled ? null : new Date(),
  });

  try {
    await enqueueCalendarSyncAction({
      externalCalendarId: calendarRow.externalCalendarId,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      enabled: input.enabled,
    });
  } catch (error) {
    // Keep DB + queue state aligned: rollback toggle when enqueue fails.
    await updateSyncEnabled({
      ctx,
      externalCalendarId: calendarRow.externalCalendarId,
      enabled: calendarRow.syncEnabled,
      syncDisabledReason: calendarRow.syncEnabled ? null : "USER_TOGGLED_OFF",
      syncDisabledBy: calendarRow.syncEnabled ? null : "USER",
      syncDisabledAt: calendarRow.syncEnabled ? null : new Date(),
    });
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to enqueue calendar sync job",
      cause: error,
    });
  }

  log.info("calendar_sync_toggle_updated", {
    event: "calendar_sync_toggle_updated",
    userId,
    calendarId: calendarRow.externalCalendarId,
    enabled: input.enabled,
    enqueued: true,
  });

  return { enabled: input.enabled, enqueued: true };
};
