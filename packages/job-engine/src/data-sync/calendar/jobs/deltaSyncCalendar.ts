import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

import { getAdapter } from "../providers/registry";
import {
  AuthExpiredError,
  CalendarProvider,
  CursorExpiredError,
  ProviderPermanentError,
  ProviderTransientError,
  RateLimitedError,
  type CredentialLike,
  type NormalizedCalendarEventDTO,
  type ProviderCursorDTO,
} from "../providers/types";
import { runInitialCalendarSync } from "./initialSyncCalendar";
import { batchUpsertExternalCalendarEvents } from "./utils/batchUpsertExternalCalendarEvents";
import { withCalendarSyncLock } from "./utils/calendarSyncLock";
import { MAX_OCCURRENCES_CAP, getRollingWindow } from "./utils/rollingWindow";
import {
  TOMBSTONE_RETENTION_DAYS,
  getActiveTombstoneExternalEventIds,
  upsertTombstonesForDeletes,
} from "./utils/tombstoneRepository";

type CalendarSyncStatus = "IDLE" | "SYNCING" | "ERROR";

interface ExternalCalendarWithCredentialRow {
  id: number;
  provider: string;
  providerCalendarId: string;
  syncEnabled: boolean;
  credentialId: number;
  credentialType: string;
  credentialKey: unknown;
  credentialUserId: number | null;
}

interface CursorRow {
  cursorType: string;
  cursor: string;
  expiresAt: Date | null;
}

const log = logger.getSubLogger({ prefix: ["[job-engine/calendar/delta-sync]"] });

const ensureCalendarProvider = (value: string): CalendarProvider => {
  if (value === CalendarProvider.GOOGLE || value === CalendarProvider.OUTLOOK) {
    return value;
  }
  throw new ProviderPermanentError({
    provider: CalendarProvider.GOOGLE,
    message: `Unsupported calendar provider: ${value}`,
  });
};

const sanitizeErrorMessage = (error: unknown): string => {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/(access_token|refresh_token|authorization)\s*[:=]\s*[^,\s]+/gi, "$1=[REDACTED]")
    .slice(0, 500);
};

const getCalendarWithCredential = async (
  calendarId: number
): Promise<ExternalCalendarWithCredentialRow | null> => {
  const rows = await prisma.$queryRaw<ExternalCalendarWithCredentialRow[]>(
    Prisma.sql`
      SELECT
        ec."id",
        ec."provider",
        ec."providerCalendarId",
        ec."syncEnabled",
        ec."credentialId",
        c."type" AS "credentialType",
        c."key" AS "credentialKey",
        c."userId" AS "credentialUserId"
      FROM "ExternalCalendar" ec
      INNER JOIN "Credential" c ON c."id" = ec."credentialId"
      WHERE ec."id" = ${calendarId}
      LIMIT 1
    `
  );

  return rows[0] ?? null;
};

const setCalendarSyncStatus = async (
  calendarId: number,
  status: CalendarSyncStatus,
  fields?: { lastErrorAt?: Date | null; lastErrorMessage?: string | null; lastSyncAt?: Date | null }
): Promise<void> => {
  const lastErrorAt = fields?.lastErrorAt ?? null;
  const lastErrorMessage = fields?.lastErrorMessage ?? null;
  const lastSyncAt = fields?.lastSyncAt ?? null;

  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE "ExternalCalendar"
      SET
        "syncStatus" = CAST(${status} AS "CalendarSyncStatus"),
        "lastErrorAt" = ${lastErrorAt},
        "lastErrorMessage" = ${lastErrorMessage},
        "lastSyncAt" = COALESCE(${lastSyncAt}, "lastSyncAt"),
        "updatedAt" = NOW()
      WHERE "id" = ${calendarId}
    `
  );
};

const getStoredCursor = async (
  tx: Prisma.TransactionClient,
  calendarId: number
): Promise<ProviderCursorDTO | null> => {
  const rows = await tx.$queryRaw<CursorRow[]>(
    Prisma.sql`
      SELECT "cursorType", "cursor", "expiresAt"
      FROM "ExternalCalendarSyncCursor"
      WHERE "calendarId" = ${calendarId}
      LIMIT 1
    `
  );

  const row = rows[0];
  if (!row?.cursor) {
    return null;
  }

  return {
    type: row.cursorType,
    value: row.cursor,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
  };
};

const isInsideWindow = (value: string, windowStart: Date, windowEnd: Date): boolean => {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    return false;
  }
  return ms >= windowStart.getTime() && ms <= windowEnd.getTime();
};

const dedupeByExternalEventId = (changes: NormalizedCalendarEventDTO[]): NormalizedCalendarEventDTO[] => {
  const map = new Map<string, NormalizedCalendarEventDTO>();
  for (const change of changes) {
    if (!change.externalEventId) {
      continue;
    }
    map.set(change.externalEventId, change);
  }
  return [...map.values()];
};

const chunk = <T>(items: T[], batchSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    chunks.push(items.slice(i, i + batchSize));
  }
  return chunks;
};

const deleteByExternalEventIds = async (
  tx: Prisma.TransactionClient,
  calendarId: number,
  externalEventIds: string[]
): Promise<number> => {
  if (externalEventIds.length === 0) {
    return 0;
  }

  let deletedCount = 0;
  for (const ids of chunk([...new Set(externalEventIds)], 200)) {
    const count = await tx.$executeRaw(
      Prisma.sql`
        DELETE FROM "ExternalCalendarEvent"
        WHERE "calendarId" = ${calendarId}
          AND "externalEventId" IN (${Prisma.join(ids)})
      `
    );
    deletedCount += Number(count);
  }
  return deletedCount;
};

const deleteByRecurringKeys = async (
  tx: Prisma.TransactionClient,
  calendarId: number,
  deleteChanges: NormalizedCalendarEventDTO[]
): Promise<number> => {
  let deletedCount = 0;

  const recurringOnlyIds = [
    ...new Set(deleteChanges.map((c) => c.recurringEventId).filter((v): v is string => !!v)),
  ];
  for (const recurringEventId of recurringOnlyIds) {
    const specificChanges = deleteChanges.filter(
      (change) => change.recurringEventId === recurringEventId && !!change.originalStartTime
    );

    if (specificChanges.length > 0) {
      for (const change of specificChanges) {
        const originalStart = new Date(change.originalStartTime as string);
        if (Number.isNaN(originalStart.getTime())) {
          continue;
        }
        const count = await tx.$executeRaw(
          Prisma.sql`
            DELETE FROM "ExternalCalendarEvent"
            WHERE "calendarId" = ${calendarId}
              AND "recurringEventId" = ${recurringEventId}
              AND "originalStartTime" = ${originalStart}
          `
        );
        deletedCount += Number(count);
      }
      continue;
    }

    const count = await tx.$executeRaw(
      Prisma.sql`
        DELETE FROM "ExternalCalendarEvent"
        WHERE "calendarId" = ${calendarId}
          AND "recurringEventId" = ${recurringEventId}
      `
    );
    deletedCount += Number(count);
  }

  return deletedCount;
};

const pruneOutOfWindowEvents = async (
  tx: Prisma.TransactionClient,
  calendarId: number,
  windowStart: Date,
  windowEnd: Date
): Promise<number> => {
  const pruned = await tx.$executeRaw(
    Prisma.sql`
      DELETE FROM "ExternalCalendarEvent"
      WHERE "calendarId" = ${calendarId}
        AND ("endTime" < ${windowStart} OR "startTime" > ${windowEnd})
    `
  );
  return Number(pruned);
};

const upsertCursor = async (
  tx: Prisma.TransactionClient,
  calendarId: number,
  cursor: ProviderCursorDTO
): Promise<void> => {
  const expiresAt =
    cursor.expiresAt && !Number.isNaN(Date.parse(cursor.expiresAt)) ? new Date(cursor.expiresAt) : null;

  await tx.$executeRaw(
    Prisma.sql`
      INSERT INTO "ExternalCalendarSyncCursor" (
        "calendarId",
        "cursor",
        "cursorType",
        "expiresAt",
        "lastDeltaSyncAt",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${calendarId},
        ${cursor.value},
        CAST(${cursor.type} AS "CalendarCursorType"),
        ${expiresAt},
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT ("calendarId")
      DO UPDATE SET
        "cursor" = EXCLUDED."cursor",
        "cursorType" = EXCLUDED."cursorType",
        "expiresAt" = EXCLUDED."expiresAt",
        "lastDeltaSyncAt" = EXCLUDED."lastDeltaSyncAt",
        "updatedAt" = NOW()
    `
  );
};

const markSyncFailure = async (calendarId: number, error: unknown): Promise<void> => {
  await setCalendarSyncStatus(calendarId, "ERROR", {
    lastErrorAt: new Date(),
    lastErrorMessage: sanitizeErrorMessage(error),
  });
};

export const runDeltaCalendarSync = async (calendarId: number): Promise<void> => {
  const startedAt = Date.now();
  let upsertedCount = 0;
  let deletedCount = 0;
  let skippedTombstoneCount = 0;
  let prunedCount = 0;
  let cursorType: string | null = null;

  const calendarRow = await getCalendarWithCredential(calendarId);
  if (!calendarRow || !calendarRow.syncEnabled) {
    return;
  }

  const provider = ensureCalendarProvider(calendarRow.provider);
  const adapter = getAdapter(provider);

  let fallbackToInitialSync = false;
  let fallbackReason: "missing_cursor" | "cursor_expired" | null = null;

  try {
    await withCalendarSyncLock(
      {
        provider,
        credentialId: calendarRow.credentialId,
        providerCalendarId: calendarRow.providerCalendarId,
      },
      async () => {
        const lockedCalendar = await getCalendarWithCredential(calendarId);
        if (!lockedCalendar || !lockedCalendar.syncEnabled) {
          return;
        }

        if (lockedCalendar.credentialUserId === null) {
          throw new ProviderPermanentError({
            provider,
            message: `Credential ${lockedCalendar.credentialId} is missing userId.`,
          });
        }

        const credential: CredentialLike = {
          id: lockedCalendar.credentialId,
          type: lockedCalendar.credentialType,
          key: lockedCalendar.credentialKey,
        };

        await setCalendarSyncStatus(calendarId, "SYNCING", {
          lastErrorAt: null,
          lastErrorMessage: null,
        });

        log.info("delta_sync_started", {
          event: "delta_sync_started",
          calendarId,
          provider,
        });

        const { windowStart, windowEnd } = getRollingWindow();
        const now = new Date();

        const storedCursor = await prisma.$transaction(async (tx) => getStoredCursor(tx, calendarId));
        if (!storedCursor) {
          fallbackToInitialSync = true;
          fallbackReason = "missing_cursor";
          return;
        }

        let result: Awaited<ReturnType<typeof adapter.fetchDelta>>;
        try {
          result = await adapter.fetchDelta({
            credential,
            providerCalendarId: lockedCalendar.providerCalendarId,
            cursor: storedCursor,
            windowStart,
            windowEnd,
            maxOccurrencesCap: MAX_OCCURRENCES_CAP,
          });
        } catch (error) {
          if (error instanceof CursorExpiredError) {
            fallbackToInitialSync = true;
            fallbackReason = "cursor_expired";
            return;
          }
          throw error;
        }

        const cappedChanges = dedupeByExternalEventId(result.changes).slice(0, MAX_OCCURRENCES_CAP);
        const deleteChanges = cappedChanges.filter((change) => change.changeType === "delete");
        const upsertCandidates = cappedChanges.filter(
          (change) =>
            change.changeType === "upsert" && isInsideWindow(change.startTime, windowStart, windowEnd)
        );
        await prisma.$transaction(async (tx) => {
          if (deleteChanges.length > 0) {
            deletedCount += await deleteByExternalEventIds(
              tx,
              calendarId,
              deleteChanges.map((change) => change.externalEventId)
            );
            deletedCount += await deleteByRecurringKeys(tx, calendarId, deleteChanges);

            await upsertTombstonesForDeletes(tx, {
              calendarId,
              deleteChanges,
              now,
              retentionDays: TOMBSTONE_RETENTION_DAYS,
            });
          }

          const activeTombstones = await getActiveTombstoneExternalEventIds(
            tx,
            calendarId,
            upsertCandidates.map((change) => change.externalEventId),
            now
          );
          const filteredUpserts = upsertCandidates.filter((change) => {
            const blocked = activeTombstones.has(change.externalEventId);
            if (blocked) {
              skippedTombstoneCount += 1;
              log.info("skipped_due_to_tombstone", {
                event: "skipped_due_to_tombstone",
                calendarId,
                provider,
                externalEventId: change.externalEventId,
              });
            }
            return !blocked;
          });

          upsertedCount = await batchUpsertExternalCalendarEvents({
            tx,
            calendarId,
            userId: lockedCalendar.credentialUserId as number,
            provider,
            events: filteredUpserts,
          });

          prunedCount = await pruneOutOfWindowEvents(tx, calendarId, windowStart, windowEnd);
          await upsertCursor(tx, calendarId, result.nextCursor);
          cursorType = result.nextCursor.type;

          await tx.$executeRaw(
            Prisma.sql`
            UPDATE "ExternalCalendar"
            SET
              "syncStatus" = CAST(${"IDLE"} AS "CalendarSyncStatus"),
              "lastSyncAt" = NOW(),
              "lastErrorAt" = NULL,
              "lastErrorMessage" = NULL,
              "updatedAt" = NOW()
            WHERE "id" = ${calendarId}
          `
          );
        });

        if (cursorType) {
          log.info("cursor_updated", {
            event: "cursor_updated",
            calendarId,
            provider,
            cursorType,
          });
        }
      }
    );
  } catch (error) {
    await markSyncFailure(calendarId, error);

    log.error("delta_sync_failed", {
      event: "delta_sync_failed",
      calendarId,
      provider,
      errorType: error instanceof Error ? error.name : "UnknownError",
      error: sanitizeErrorMessage(error),
    });

    if (error instanceof AuthExpiredError || error instanceof ProviderPermanentError) {
      return;
    }
    if (error instanceof RateLimitedError || error instanceof ProviderTransientError) {
      throw error;
    }
    throw error;
  }

  if (fallbackToInitialSync) {
    if (fallbackReason === "cursor_expired") {
      log.warn("cursor_expired_fallback", {
        event: "cursor_expired_fallback",
        calendarId,
        provider,
      });
    }

    await runInitialCalendarSync(calendarId);
    return;
  }

  const durationMs = Date.now() - startedAt;
  log.info("delta_sync_completed", {
    event: "delta_sync_completed",
    calendarId,
    provider,
    upsertedCount,
    deletedCount,
    skippedTombstoneCount,
    prunedCount,
    durationMs,
  });
};
