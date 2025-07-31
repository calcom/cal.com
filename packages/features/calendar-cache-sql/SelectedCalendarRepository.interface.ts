import type { SelectedCalendar } from "@calcom/types/Calendar";

export interface ISelectedCalendarRepository {
  findManyBySelectedCalendars(selectedCalendars: SelectedCalendar[]): Promise<
    Array<{
      id: string;
      userId: number;
      integration: string;
      externalId: string;
      credentialId: number | null;
    }>
  >;
}
