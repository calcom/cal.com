import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type { ICalendarCacheEventRepository } from "./CalendarCacheEventRepository.interface";

interface CalendarCacheEventInput {
  externalId: string;
  selectedCalendarId: string;
  start: Date;
  end: Date;
  summary?: string | null;
  description?: string | null;
  location?: string | null;
  isAllDay?: boolean | null;
  timeZone?: string | null;
}

interface CalendarCacheEventTimeRange {
  start: Date;
  end: Date;
  timeZone: string | null;
}

export class KyselyCalendarCacheEventRepository implements ICalendarCacheEventRepository {
  constructor(
    private readonly dbRead: Kysely<KyselyDatabase>,
    private readonly dbWrite: Kysely<KyselyDatabase>
  ) {}

  async findAllBySelectedCalendarIdsBetween(
    selectedCalendarIds: string[],
    start: Date,
    end: Date
  ): Promise<CalendarCacheEventTimeRange[]> {
    if (selectedCalendarIds.length === 0) {
      return [];
    }

    const results = await this.dbRead
      .selectFrom("CalendarCacheEvent")
      .select(["start", "end", "timeZone"])
      .where("selectedCalendarId", "in", selectedCalendarIds)
      .where("start", "<", end)
      .where("end", ">", start)
      .execute();

    return results.map((r) => ({
      start: r.start,
      end: r.end,
      timeZone: r.timeZone,
    }));
  }

  async upsertMany(events: CalendarCacheEventInput[]): Promise<unknown> {
    if (events.length === 0) {
      return;
    }

    const results = await Promise.allSettled(
      events.map(async (event) => {
        const existing = await this.dbRead
          .selectFrom("CalendarCacheEvent")
          .select(["id"])
          .where("externalId", "=", event.externalId)
          .where("selectedCalendarId", "=", event.selectedCalendarId)
          .executeTakeFirst();

        if (existing) {
          return this.dbWrite
            .updateTable("CalendarCacheEvent")
            .set({
              start: event.start,
              end: event.end,
              summary: event.summary,
              description: event.description,
              location: event.location,
              isAllDay: event.isAllDay,
              timeZone: event.timeZone,
            })
            .where("externalId", "=", event.externalId)
            .where("selectedCalendarId", "=", event.selectedCalendarId)
            .execute();
        }

        return this.dbWrite
          .insertInto("CalendarCacheEvent")
          .values({
            externalId: event.externalId,
            selectedCalendarId: event.selectedCalendarId,
            start: event.start,
            end: event.end,
            summary: event.summary ?? null,
            description: event.description ?? null,
            location: event.location ?? null,
            isAllDay: event.isAllDay ?? null,
            timeZone: event.timeZone ?? null,
          })
          .execute();
      })
    );

    return results;
  }

  async deleteMany(
    events: { externalId: string; selectedCalendarId: string }[]
  ): Promise<unknown> {
    const conditions = events.filter((c) => c.externalId && c.selectedCalendarId);
    if (conditions.length === 0) {
      return;
    }

    const results = await Promise.allSettled(
      conditions.map((event) =>
        this.dbWrite
          .deleteFrom("CalendarCacheEvent")
          .where("externalId", "=", event.externalId)
          .where("selectedCalendarId", "=", event.selectedCalendarId)
          .execute()
      )
    );

    return results;
  }

  async deleteAllBySelectedCalendarId(selectedCalendarId: string): Promise<unknown> {
    if (!selectedCalendarId) {
      return;
    }

    return this.dbWrite
      .deleteFrom("CalendarCacheEvent")
      .where("selectedCalendarId", "=", selectedCalendarId)
      .execute();
  }

  async deleteStale(): Promise<unknown> {
    return this.dbWrite
      .deleteFrom("CalendarCacheEvent")
      .where("end", "<=", new Date())
      .execute();
  }
}
