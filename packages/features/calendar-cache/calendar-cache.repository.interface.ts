import type { CalendarCache, Prisma } from "@prisma/client";

export type FreeBusyArgs = { timeMin: string; timeMax: string; items: { id: string }[] };

export interface ICalendarCacheRepository {
  watchCalendar(args: { calendarId: string }): Promise<any>;
  unwatchCalendar(args: { calendarId: string }): Promise<any>;
  upsertCachedAvailability(
    credentialId: number,
    args: FreeBusyArgs,
    value: Prisma.JsonNullValueInput | Prisma.InputJsonValue
  ): Promise<void>;
  getCachedAvailability(credentialId: number, args: FreeBusyArgs): Promise<CalendarCache | null>;
}
