import type { CalendarCache, Prisma } from "@prisma/client";

import type { SelectedCalendarEventTypeIds } from "@calcom/types/Calendar";

/**
 * @deprecated This type is deprecated and will be removed in a future version.
 * Use the new calendar-cache-sql feature instead.
 */
export type FreeBusyArgs = { timeMin: string; timeMax: string; items: { id: string }[] };

/**
 * @deprecated This interface is deprecated and will be removed in a future version.
 * Use the new calendar-cache-sql feature instead.
 */
export interface ICalendarCacheRepository {
  /**
   * @deprecated This method is deprecated and will be removed in a future version.
   * Use the new calendar-cache-sql feature instead.
   */
  watchCalendar(args: { calendarId: string; eventTypeIds: SelectedCalendarEventTypeIds }): Promise<any>;
  /**
   * @deprecated This method is deprecated and will be removed in a future version.
   * Use the new calendar-cache-sql feature instead.
   */
  unwatchCalendar(args: { calendarId: string; eventTypeIds: SelectedCalendarEventTypeIds }): Promise<any>;
  /**
   * @deprecated This method is deprecated and will be removed in a future version.
   * Use the new calendar-cache-sql feature instead.
   */
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
  /**
   * @deprecated This method is deprecated and will be removed in a future version.
   * Use the new calendar-cache-sql feature instead.
   */
  getCachedAvailability({
    credentialId,
    userId,
    args,
  }: {
    credentialId: number;
    userId: number | null;
    args: FreeBusyArgs;
  }): Promise<CalendarCache | null>;
  /**
   * @deprecated This method is deprecated and will be removed in a future version.
   * Use the new calendar-cache-sql feature instead.
   */
  getCacheStatusByCredentialIds(
    credentialIds: number[]
  ): Promise<{ credentialId: number; updatedAt: Date | null }[]>;
}
