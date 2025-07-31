import type { EventBusyDate, SelectedCalendar } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

export interface ICalendarCacheReadService {
  getBusyCalendarTimes(
    credentials: CredentialForCalendarService[],
    startDate: string,
    endDate: string,
    selectedCalendars: SelectedCalendar[],
    shouldServeCache?: boolean
  ): Promise<EventBusyDate[][]>;
}
