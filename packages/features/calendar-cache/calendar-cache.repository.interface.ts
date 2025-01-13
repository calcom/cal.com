import type { CalendarCache, Prisma } from "@prisma/client";

import type { SelectedCalendarEventTypeIds } from "@calcom/types/Calendar";

export type FreeBusyArgs = { timeMin: string; timeMax: string; items: { id: string }[] };

export interface ICalendarCacheRepository {
  watchCalendar(args: { calendarId: string; eventTypeIds: SelectedCalendarEventTypeIds }): Promise<any>;
  unwatchCalendar(args: { calendarId: string; eventTypeIds: SelectedCalendarEventTypeIds }): Promise<any>;
  upsertCachedAvailability(
    credentialId: number,
    args: FreeBusyArgs,
    value: Prisma.JsonNullValueInput | Prisma.InputJsonValue
  ): Promise<void>;
  getCachedAvailability(credentialId: number, args: FreeBusyArgs): Promise<CalendarCache | null>;
}
