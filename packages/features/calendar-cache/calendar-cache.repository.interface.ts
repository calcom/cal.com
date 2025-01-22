import type { CalendarCache, Prisma } from "@prisma/client";

import type { SelectedCalendarEventTypeIds } from "@calcom/types/Calendar";

export type FreeBusyArgs = { timeMin: string; timeMax: string; items: { id: string }[] };

export type DwdCredentialArgs = {
  dwdId: string | null;
  userId: number | null;
};

export type CredentialArgs = {
  credentialId: number | null;
} & DwdCredentialArgs;

export interface ICalendarCacheRepository {
  watchCalendar(args: { calendarId: string; eventTypeIds: SelectedCalendarEventTypeIds }): Promise<any>;
  unwatchCalendar(args: { calendarId: string; eventTypeIds: SelectedCalendarEventTypeIds }): Promise<any>;
  upsertCachedAvailability(args: {
    credentialId: number | null;
    userId: number | null;
    dwdId: string | null;
    args: FreeBusyArgs;
    value: Prisma.JsonNullValueInput | Prisma.InputJsonValue;
  }): Promise<void>;
  getCachedAvailability(args: {
    credentialId: number | null;
    dwdId: string | null;
    userId: number | null;
    args: FreeBusyArgs;
  }): Promise<CalendarCache | null>;
  deleteManyByCredential(args: {
    credentialId: number | null;
    userId: number | null;
    dwdId: string | null;
  }): Promise<void>;
}
