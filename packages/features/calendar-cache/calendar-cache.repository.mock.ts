import type { ICalendarCacheRepository } from "./calendar-cache.repository.interface";

export class CalendarCacheRepositoryMock implements ICalendarCacheRepository {
  async watchCalendar(args: { calendarId: string }) {
    return {};
  }

  async unwatchCalendar(args: { calendarId: string }) {
    return {};
  }
}
