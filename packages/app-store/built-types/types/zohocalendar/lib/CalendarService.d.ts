import logger from "@calcom/lib/logger";
import type { Calendar, CalendarEvent, EventBusyDate, IntegrationCalendar, NewCalendarEventType } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { ZohoAuthCredentials } from "../types/ZohoCalendar";
export default class ZohoCalendarService implements Calendar {
    private integrationName;
    private log;
    auth: {
        getToken: () => Promise<ZohoAuthCredentials>;
    };
    constructor(credential: CredentialPayload);
    private zohoAuth;
    private fetcher;
    private getUserInfo;
    createEvent(event: CalendarEvent): Promise<NewCalendarEventType>;
    /**
     * @param uid
     * @param event
     * @returns
     */
    updateEvent(uid: string, event: CalendarEvent, externalCalendarId?: string): Promise<any>;
    /**
     * @param uid
     * @param event
     * @returns
     */
    deleteEvent(uid: string, event: CalendarEvent, externalCalendarId?: string): Promise<void>;
    private getBusyData;
    private getUnavailability;
    getAvailability(dateFrom: string, dateTo: string, selectedCalendars: IntegrationCalendar[]): Promise<EventBusyDate[]>;
    listCalendars(): Promise<IntegrationCalendar[]>;
    handleData(response: Response, log: typeof logger): Promise<any>;
    private translateEvent;
}
//# sourceMappingURL=CalendarService.d.ts.map