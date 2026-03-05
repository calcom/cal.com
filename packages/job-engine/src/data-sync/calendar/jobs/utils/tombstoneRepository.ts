import { Prisma } from "@prisma/client";

import type { NormalizedCalendarEventDTO } from "../../providers";

export const TOMBSTONE_RETENTION_DAYS = 30;

interface TombstoneRow {
  externalEventId: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 200;

const chunk = <T>(items: T[], batchSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    chunks.push(items.slice(i, i + batchSize));
  }
  return chunks;
};

const dedupeExternalEventIds = (ids: string[]): string[] => [...new Set(ids.filter(Boolean))];

const toDateOrNull = (value: string | null): Date | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getActiveTombstoneExternalEventIds = async (
  tx: Prisma.TransactionClient,
  calendarId: number,
  externalEventIds: string[],
  now: Date
): Promise<Set<string>> => {
  const uniqueIds = dedupeExternalEventIds(externalEventIds);
  if (uniqueIds.length === 0) {
    return new Set<string>();
  }

  const resultSet = new Set<string>();
  const batches = chunk(uniqueIds, DEFAULT_BATCH_SIZE);

  for (const ids of batches) {
    const rows = await tx.$queryRaw<TombstoneRow[]>(
      Prisma.sql`
        SELECT "externalEventId"
        FROM "ExternalCalendarEventTombstone"
        WHERE "calendarId" = ${calendarId}
          AND "expiresAt" > ${now}
          AND "externalEventId" IN (${Prisma.join(ids)})
      `
    );

    for (const row of rows) {
      resultSet.add(row.externalEventId);
    }
  }

  return resultSet;
};

export const upsertTombstonesForDeletes = async (
  tx: Prisma.TransactionClient,
  params: {
    calendarId: number;
    deleteChanges: NormalizedCalendarEventDTO[];
    now?: Date;
    retentionDays?: number;
    batchSize?: number;
  }
): Promise<number> => {
  const now = params.now ?? new Date();
  const retentionDays = params.retentionDays ?? TOMBSTONE_RETENTION_DAYS;
  const batchSize = params.batchSize ?? DEFAULT_BATCH_SIZE;
  const expiresAt = new Date(now.getTime() + retentionDays * DAY_MS);

  const dedupedChangesMap = new Map<string, NormalizedCalendarEventDTO>();
  for (const change of params.deleteChanges) {
    if (change.changeType !== "delete" || !change.externalEventId) {
      continue;
    }
    dedupedChangesMap.set(change.externalEventId, change);
  }

  const dedupedChanges = [...dedupedChangesMap.values()];
  if (dedupedChanges.length === 0) {
    return 0;
  }

  for (const batch of chunk(dedupedChanges, Math.max(1, batchSize))) {
    const values = batch.map((change) => {
      const rawPayloadJson = JSON.stringify(change.rawPayload ?? null);
      return Prisma.sql`(
        ${params.calendarId},
        ${change.externalEventId},
        ${change.iCalUID},
        ${change.recurringEventId},
        ${toDateOrNull(change.originalStartTime)},
        ${now},
        ${expiresAt},
        CAST(${rawPayloadJson} AS jsonb),
        ${now},
        ${now}
      )`;
    });

    await tx.$executeRaw(
      Prisma.sql`
        INSERT INTO "ExternalCalendarEventTombstone" (
          "calendarId",
          "externalEventId",
          "iCalUID",
          "recurringEventId",
          "originalStartTime",
          "deletedAt",
          "expiresAt",
          "rawPayload",
          "createdAt",
          "updatedAt"
        )
        VALUES ${Prisma.join(values)}
        ON CONFLICT ("calendarId", "externalEventId")
        DO UPDATE SET
          "iCalUID" = EXCLUDED."iCalUID",
          "recurringEventId" = EXCLUDED."recurringEventId",
          "originalStartTime" = EXCLUDED."originalStartTime",
          "deletedAt" = EXCLUDED."deletedAt",
          "expiresAt" = EXCLUDED."expiresAt",
          "rawPayload" = EXCLUDED."rawPayload",
          "updatedAt" = EXCLUDED."updatedAt"
      `
    );
  }

  return dedupedChanges.length;
};
