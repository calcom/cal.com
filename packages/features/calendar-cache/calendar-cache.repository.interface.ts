export interface ICalendarCacheRepository {
  watchCalendar(args: { calendarId: string }): Promise<any>;
  unwatchCalendar(args: { calendarId: string }): Promise<any>;
}
