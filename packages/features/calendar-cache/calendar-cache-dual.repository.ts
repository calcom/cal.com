import type { Calendar, SelectedCalendarEventTypeIds } from "@calcom/types/Calendar";

import { CalendarCacheSqlRepository } from "./calendar-cache-sql.repository";
import { CalendarCacheRepository } from "./calendar-cache.repository";
import type { ICalendarCacheRepository, FreeBusyArgs } from "./calendar-cache.repository.interface";

export class CalendarCacheDualRepository implements ICalendarCacheRepository {
  private jsonCache: CalendarCacheRepository;
  private sqlCache: CalendarCacheSqlRepository;
  private credentialId: number;
  private userId: number | null;
  private teamId: number | null;

  constructor(
    calendar: Calendar | null,
    credentialId: number,
    userId: number | null,
    teamId?: number | null
  ) {
    this.credentialId = credentialId;
    this.userId = userId;
    this.teamId = teamId || null;
    this.jsonCache = new CalendarCacheRepository(calendar);
    this.sqlCache = new CalendarCacheSqlRepository(calendar, credentialId, userId, teamId);
  }

  async watchCalendar(args: { calendarId: string; eventTypeIds: SelectedCalendarEventTypeIds }) {
    return await this.jsonCache.watchCalendar(args);
  }

  async unwatchCalendar(args: { calendarId: string; eventTypeIds: SelectedCalendarEventTypeIds }) {
    return await this.jsonCache.unwatchCalendar(args);
  }

  async getCachedAvailability(args: { credentialId: number; userId: number | null; args: FreeBusyArgs }) {
    if (await this.sqlCache.shouldUseSqlCacheForReading()) {
      return await this.sqlCache.getCachedAvailability(args);
    }

    return await this.jsonCache.getCachedAvailability(args);
  }

  async upsertCachedAvailability(args: {
    credentialId: number;
    userId: number | null;
    args: FreeBusyArgs;
    value: any;
    nextSyncToken?: string | null;
  }) {
    await this.jsonCache.upsertCachedAvailability(args);

    if (await this.sqlCache.shouldUseSqlCacheForWriting()) {
      await this.sqlCache.upsertCachedAvailability(args);
    }
  }

  async getCacheStatusByCredentialIds(
    credentialIds: number[]
  ): Promise<{ credentialId: number; updatedAt: Date | null }[]> {
    if (await this.sqlCache.shouldUseSqlCacheForReading()) {
      return await this.sqlCache.getCacheStatusByCredentialIds(credentialIds);
    }

    return await this.jsonCache.getCacheStatusByCredentialIds(credentialIds);
  }
}
