import type { CalendarCache, Prisma } from "@prisma/client";

import type { SelectedCalendarEventTypeIds } from "@calcom/types/Calendar";

export type FreeBusyArgs = { timeMin: string; timeMax: string; items: { id: string }[] };

export type DelegationCredentialArgs = {
  delegationCredentialId: string | null;
  userId: number | null;
};

export type CredentialArgs = {
  credentialId: number | null;
} & DelegationCredentialArgs;

export interface ICalendarCacheRepository {
  watchCalendar(args: { calendarId: string; eventTypeIds: SelectedCalendarEventTypeIds }): Promise<any>;
  unwatchCalendar(args: { calendarId: string; eventTypeIds: SelectedCalendarEventTypeIds }): Promise<any>;
  upsertCachedAvailability(args: {
    credentialId: number | null;
    userId: number | null;
    delegationCredentialId: string | null;
    args: FreeBusyArgs;
    value: Prisma.JsonNullValueInput | Prisma.InputJsonValue;
  }): Promise<void>;
  getCachedAvailability(args: {
    credentialId: number | null;
    delegationCredentialId: string | null;
    userId: number | null;
    args: FreeBusyArgs;
  }): Promise<CalendarCache | null>;
  deleteManyByCredential(args: {
    credentialId: number | null;
    userId: number | null;
    delegationCredentialId: string | null;
  }): Promise<void>;
}
