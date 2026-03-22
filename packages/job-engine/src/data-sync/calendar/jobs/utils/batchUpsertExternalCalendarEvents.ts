import { Prisma } from "@prisma/client";

import type { CalendarProvider, NormalizedCalendarEventDTO } from "../../providers";

export interface UpsertExternalEventsInput {
  tx: Prisma.TransactionClient;
  calendarId: number;
  userId: number;
  provider: CalendarProvider;
  events: NormalizedCalendarEventDTO[];
  batchSize?: number;
}

const DEFAULT_BATCH_SIZE = 150;

const toDateOrThrow = (value: string, fieldName: string): Date => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value for ${fieldName}.`);
  }
  return parsed;
};

const toOptionalDate = (value?: string | null): Date | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
};

const dedupeByExternalEventId = (events: NormalizedCalendarEventDTO[]): NormalizedCalendarEventDTO[] => {
  const map = new Map<string, NormalizedCalendarEventDTO>();
  for (const event of events) {
    map.set(event.externalEventId, event);
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

export const batchUpsertExternalCalendarEvents = async ({
  tx,
  calendarId,
  userId,
  provider,
  events,
  batchSize = DEFAULT_BATCH_SIZE,
}: UpsertExternalEventsInput): Promise<number> => {
  const deduped = dedupeByExternalEventId(events).filter((event) => event.changeType === "upsert");
  if (deduped.length === 0) {
    return 0;
  }

  const now = new Date();
  const batches = chunk(deduped, Math.max(1, batchSize));

  for (const batch of batches) {
    const values = batch.map((event) => {
      const startTime = toDateOrThrow(event.startTime, "startTime");
      const endTime = toDateOrThrow(event.endTime, "endTime");
      const originalStartTime = toOptionalDate(event.originalStartTime);
      const providerUpdatedAt = toOptionalDate(event.providerUpdatedAt);
      const rawPayloadJson = JSON.stringify(event.rawPayload ?? null);

      return Prisma.sql`(
        ${userId},
        ${calendarId},
        CAST(${provider} AS "CalendarProvider"),
        ${event.externalEventId},
        ${event.iCalUID},
        ${event.recurringEventId},
        ${originalStartTime},
        ${startTime},
        ${endTime},
        ${event.isAllDay},
        ${event.showAsBusy},
        ${event.status},
        ${providerUpdatedAt},
        ${event.sequence},
        CAST(${rawPayloadJson} AS jsonb),
        ${now},
        ${now}
      )`;
    });

    await tx.$executeRaw(
      Prisma.sql`
        INSERT INTO "ExternalCalendarEvent" (
          "userId",
          "calendarId",
          "provider",
          "externalEventId",
          "iCalUID",
          "recurringEventId",
          "originalStartTime",
          "startTime",
          "endTime",
          "isAllDay",
          "showAsBusy",
          "status",
          "providerUpdatedAt",
          "sequence",
          "rawPayload",
          "createdAt",
          "updatedAt"
        )
        VALUES ${Prisma.join(values)}
        ON CONFLICT ("calendarId", "externalEventId")
        DO UPDATE SET
          "userId" = EXCLUDED."userId",
          "provider" = EXCLUDED."provider",
          "iCalUID" = EXCLUDED."iCalUID",
          "recurringEventId" = EXCLUDED."recurringEventId",
          "originalStartTime" = EXCLUDED."originalStartTime",
          "startTime" = EXCLUDED."startTime",
          "endTime" = EXCLUDED."endTime",
          "isAllDay" = EXCLUDED."isAllDay",
          "showAsBusy" = EXCLUDED."showAsBusy",
          "status" = EXCLUDED."status",
          "providerUpdatedAt" = EXCLUDED."providerUpdatedAt",
          "sequence" = EXCLUDED."sequence",
          "rawPayload" = EXCLUDED."rawPayload",
          "updatedAt" = EXCLUDED."updatedAt"
      `
    );
  }

  return deduped.length;
};
