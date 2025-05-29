import type { CalendarCache, Prisma } from "@prisma/client";

import type { Calendar } from "@calcom/types/Calendar";
import type { SelectedCalendarEventTypeIds, CalendarSubscription } from "@calcom/types/Calendar";

export type FreeBusyArgs = { timeMin: string; timeMax: string; items: { id: string }[] };

export interface ICalendarCacheRepository {
  watchCalendar(args: {
    calendarId: string;
    eventTypeIds: SelectedCalendarEventTypeIds;
    calendarSubscription: CalendarSubscription | null;
  }): Promise<any>;
  unwatchCalendar(args: {
    calendarId: string;
    eventTypeIds: SelectedCalendarEventTypeIds;
    calendarSubscription: CalendarSubscription | null;
  }): Promise<any>;
  upsertCachedAvailability({
    credentialId,
    userId,
    args,
    value,
  }: {
    credentialId: number;
    userId: number | null;
    args: FreeBusyArgs;
    value: Prisma.JsonNullValueInput | Prisma.InputJsonValue;
  }): Promise<void>;
  getCachedAvailability({
    credentialId,
    userId,
    args,
  }: {
    credentialId: number;
    userId: number | null;
    args: FreeBusyArgs;
  }): Promise<CalendarCache | null>;

  getCalendarService(): Promise<Calendar | null>;
}
