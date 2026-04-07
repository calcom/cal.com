import { randomUUID } from "node:crypto";
import type { CalendarCacheEventRepository } from "@calcom/features/calendar/repositories/calendar-cache-event-repository";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";
import type { CalendarCacheEvent } from "@calcom/prisma/client";
import { Prisma } from "@calcom/prisma/client";

const log = logger.getSubLogger({ prefix: ["PrismaCalendarCacheEventRepository"] });

const BATCH_SIZE = 1000;

// ---------------------------------------------------------------------------
// Type-safe column definitions derived from CalendarCacheEvent
// ---------------------------------------------------------------------------

/**
 * All columns inserted during an upsert, typed against CalendarCacheEvent
 * to prevent schema drift. Order must match the values produced by `toSqlRow`.
 */
const INSERT_COLUMN_KEYS = [
  "id",
  "selectedCalendarId",
  "externalId",
  "externalEtag",
  "iCalUID",
  "iCalSequence",
  "summary",
  "description",
  "location",
  "start",
  "end",
  "isAllDay",
  "timeZone",
  "status",
  "recurringEventId",
  "originalStartTime",
  "externalCreatedAt",
  "externalUpdatedAt",
  "createdAt",
  "updatedAt",
] as const satisfies readonly (keyof CalendarCacheEvent)[];

const INSERT_COLUMNS = INSERT_COLUMN_KEYS.map((c) => `"${c}"`).join(", ");

/**
 * Columns updated on conflict (everything except the composite key and
 * createdAt). `updatedAt` is set to NOW() rather than EXCLUDED.
 */
const UPSERT_UPDATE_KEYS = [
  "iCalUID",
  "iCalSequence",
  "start",
  "end",
  "summary",
  "description",
  "location",
  "isAllDay",
  "timeZone",
  "status",
  "externalEtag",
  "recurringEventId",
  "originalStartTime",
  "externalUpdatedAt",
] as const satisfies readonly (keyof CalendarCacheEvent)[];

const UPSERT_SET_CLAUSE =
  UPSERT_UPDATE_KEYS.map((c) => `"${c}" = EXCLUDED."${c}"`).join(", ") + ', "updatedAt" = NOW()';

export class PrismaCalendarCacheEventRepository implements CalendarCacheEventRepository {
  constructor(private prismaClient: PrismaClient) {}

  async upsertMany(events: Partial<CalendarCacheEvent>[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    const batchCount = Math.ceil(events.length / BATCH_SIZE);
    log.info(`Upserting ${events.length} events in ${batchCount} batches`);

    for (let i = 0; i < events.length; i += BATCH_SIZE) {
      const batch = events.slice(i, i + BATCH_SIZE);
      await this.upsertBatch(batch);
    }
  }

  /**
   * Raw SQL is used instead of Prisma's createMany because Prisma does not
   * support upsert semantics in createMany. Using INSERT ... ON CONFLICT is
   * 10-50x faster for large batches compared to individual Prisma upsert calls.
   */
  private async upsertBatch(events: Partial<CalendarCacheEvent>[]): Promise<void> {
    const values = events.map((e) => this.toSqlRow(e));

    await this.prismaClient.$executeRaw`
      INSERT INTO "CalendarCacheEvent" (${Prisma.raw(INSERT_COLUMNS)})
      VALUES ${Prisma.join(values)}
      ON CONFLICT ("selectedCalendarId", "externalId")
      DO UPDATE SET ${Prisma.raw(UPSERT_SET_CLAUSE)}
    `;
  }

  private toSqlRow(e: Partial<CalendarCacheEvent>): Prisma.Sql {
    if (!e.selectedCalendarId) {
      throw ErrorWithCode.Factory.BadRequest("selectedCalendarId is required for calendar cache upsert");
    }
    if (!e.externalId) {
      throw ErrorWithCode.Factory.BadRequest("externalId is required for calendar cache upsert");
    }
    if (!e.start) {
      throw ErrorWithCode.Factory.BadRequest("start is required for calendar cache upsert");
    }
    if (!e.end) {
      throw ErrorWithCode.Factory.BadRequest("end is required for calendar cache upsert");
    }

    const id = e.id ?? randomUUID();
    const status = (e.status ?? "confirmed") as string;

    return Prisma.sql`(
      ${id},
      ${e.selectedCalendarId},
      ${e.externalId},
      ${e.externalEtag ?? ""},
      ${e.iCalUID ?? null},
      ${e.iCalSequence ?? 0},
      ${e.summary ?? null},
      ${e.description ?? null},
      ${e.location ?? null},
      ${e.start},
      ${e.end},
      ${e.isAllDay ?? false},
      ${e.timeZone ?? null},
      ${status}::"CalendarCacheEventStatus",
      ${e.recurringEventId ?? null},
      ${e.originalStartTime ?? null},
      ${e.externalCreatedAt ?? null},
      ${e.externalUpdatedAt ?? null},
      NOW(),
      NOW()
    )`;
  }

  async deleteMany(events: Pick<CalendarCacheEvent, "externalId" | "selectedCalendarId">[]): Promise<void> {
    const conditions = events.filter((c) => c.externalId && c.selectedCalendarId);
    if (conditions.length === 0) {
      return;
    }

    const result = await this.prismaClient.calendarCacheEvent.deleteMany({
      where: {
        OR: conditions,
      },
    });
    log.info(`Deleted ${result.count} cached events`);
  }

  async deleteAllBySelectedCalendarId(selectedCalendarId: string): Promise<void> {
    if (!selectedCalendarId) {
      throw ErrorWithCode.Factory.BadRequest("selectedCalendarId is required to delete cached events");
    }

    const result = await this.prismaClient.calendarCacheEvent.deleteMany({
      where: { selectedCalendarId },
    });
    log.info(`Deleted ${result.count} cached events for selectedCalendar ${selectedCalendarId}`);
  }

  async deleteStale(): Promise<void> {
    const result = await this.prismaClient.calendarCacheEvent.deleteMany({
      where: {
        end: { lte: new Date() },
      },
    });
    log.info(`Deleted ${result.count} stale cached events`);
  }

  async findBusyTimesBetween(
    selectedCalendarIds: string[],
    start: Date,
    end: Date
  ): Promise<Array<{ start: Date; end: Date; timeZone: string | null }>> {
    const overlapsWithRange = {
      AND: [{ start: { lt: end } }, { end: { gt: start } }],
    };

    return this.prismaClient.calendarCacheEvent.findMany({
      where: {
        selectedCalendarId: { in: selectedCalendarIds },
        ...overlapsWithRange,
      },
      select: {
        start: true,
        end: true,
        timeZone: true,
      },
    });
  }
}
