import { randomUUID } from "node:crypto";
import type { ICalendarCacheEventRepository } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventRepository.interface";
import type { PrismaClient } from "@calcom/prisma";
import type { CalendarCacheEvent } from "@calcom/prisma/client";
import { Prisma } from "@calcom/prisma/client";

export class CalendarCacheEventRepository implements ICalendarCacheEventRepository {
  // PostgreSQL wire protocol allows max ~65,535 params; with 20 cols per row, ~3,276 rows max.
  static UPSERT_BATCH_SIZE = 1000;

  constructor(private prismaClient: PrismaClient) {}

  async findAllBySelectedCalendarIdsBetween(
    selectedCalendarId: string[],
    start: Date,
    end: Date
  ): Promise<Pick<CalendarCacheEvent, "start" | "end" | "timeZone">[]> {
    return this.prismaClient.calendarCacheEvent.findMany({
      where: {
        selectedCalendarId: {
          in: selectedCalendarId,
        },
        AND: [{ start: { lt: end } }, { end: { gt: start } }],
      },
      select: {
        start: true,
        end: true,
        timeZone: true,
      },
    });
  }

  async upsertMany(events: CalendarCacheEvent[]) {
    if (events.length === 0) {
      return;
    }

    for (let i = 0; i < events.length; i += CalendarCacheEventRepository.UPSERT_BATCH_SIZE) {
      const batch = events.slice(i, i + CalendarCacheEventRepository.UPSERT_BATCH_SIZE);
      await this.upsertBatch(batch);
    }
  }

  private async upsertBatch(events: CalendarCacheEvent[]) {
    // $executeRaw bypasses Prisma defaults, so we apply them explicitly here
    // to prevent NOT NULL violations on columns with Prisma-level defaults.
    const values = events.map(
      (e) => Prisma.sql`(
        ${e.id ?? randomUUID()}, ${e.selectedCalendarId}, ${e.externalId}, ${e.externalEtag},
        ${e.iCalUID}, ${e.iCalSequence ?? 0}, ${e.summary}, ${e.description},
        ${e.location}, ${e.start}, ${e.end}, ${e.isAllDay ?? false}, ${e.timeZone},
        ${(e.status ?? "confirmed") as string}::"CalendarCacheEventStatus", ${e.recurringEventId},
        ${e.originalStartTime}, ${e.externalCreatedAt}, ${e.externalUpdatedAt},
        NOW(), NOW()
      )`
    );

    return this.prismaClient.$executeRaw`
      INSERT INTO "CalendarCacheEvent" (
        "id", "selectedCalendarId", "externalId", "externalEtag",
        "iCalUID", "iCalSequence", "summary", "description",
        "location", "start", "end", "isAllDay", "timeZone",
        "status", "recurringEventId", "originalStartTime",
        "externalCreatedAt", "externalUpdatedAt", "createdAt", "updatedAt"
      ) VALUES ${Prisma.join(values)}
      ON CONFLICT ("selectedCalendarId", "externalId")
      DO UPDATE SET
        "start" = EXCLUDED."start",
        "end" = EXCLUDED."end",
        "summary" = EXCLUDED."summary",
        "description" = EXCLUDED."description",
        "location" = EXCLUDED."location",
        "isAllDay" = EXCLUDED."isAllDay",
        "timeZone" = EXCLUDED."timeZone",
        "updatedAt" = NOW()
    `;
  }

  async deleteMany(events: Pick<CalendarCacheEvent, "externalId" | "selectedCalendarId">[]) {
    // Only delete events with externalId and selectedCalendarId
    const conditions = events.filter((c) => c.externalId && c.selectedCalendarId);
    if (conditions.length === 0) {
      return;
    }

    return this.prismaClient.calendarCacheEvent.deleteMany({
      where: {
        OR: conditions,
      },
    });
  }

  async deleteAllBySelectedCalendarId(selectedCalendarId: string) {
    if (!selectedCalendarId) {
      return;
    }

    return this.prismaClient.calendarCacheEvent.deleteMany({
      where: {
        selectedCalendarId,
      },
    });
  }

  async deleteStale() {
    return this.prismaClient.calendarCacheEvent.deleteMany({
      where: {
        end: { lte: new Date() },
      },
    });
  }
}
