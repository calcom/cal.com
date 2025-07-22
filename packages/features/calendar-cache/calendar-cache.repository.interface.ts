import type { CalendarCache, Prisma } from "@prisma/client";

import type { SelectedCalendarEventTypeIds } from "@calcom/types/Calendar";

export type FreeBusyArgs = { timeMin: string; timeMax: string; items: { id: string }[] };

export interface ICalendarCacheRepository {
  watchCalendar(args: { calendarId: string; eventTypeIds: SelectedCalendarEventTypeIds }): Promise<any>;
  unwatchCalendar(args: { calendarId: string; eventTypeIds: SelectedCalendarEventTypeIds }): Promise<any>;
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
  getCacheStatusByCredentialIds(
    credentialIds: number[]
  ): Promise<{ credentialId: number; updatedAt: Date | null }[]>;
}
