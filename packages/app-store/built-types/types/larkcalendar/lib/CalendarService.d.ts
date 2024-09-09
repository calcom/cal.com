import type { Calendar, CalendarEvent, EventBusyDate, IntegrationCalendar, NewCalendarEventType } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { LarkEvent } from "../types/LarkCalendar";
export default class LarkCalendarService implements Calendar {
    private url;
    private integrationName;
    private log;
    auth: {
        getToken: () => Promise<string>;
    };
    private credential;
    constructor(credential: CredentialPayload);
    private larkAuth;
    private refreshAccessToken;
    private fetcher;
    createEvent(event: CalendarEvent, credentialId: number): Promise<NewCalendarEventType>;
    private createAttendees;
    /**
     * @param uid
     * @param event
     * @returns
     */
    updateEvent(uid: string, event: CalendarEvent, externalCalendarId?: string): Promise<{
        uid: string;
        id: string;
        type: string;
        password: string;
        url: string;
        additionalInfo: {};
        code: number;
        msg: string;
        data: {
            event: LarkEvent;
        };
    }>;
    /**
     * @param uid
     * @param event
     * @returns
     */
    deleteEvent(uid: string, event: CalendarEvent, externalCalendarId?: string): Promise<void>;
    getAvailability(dateFrom: string, dateTo: string, selectedCalendars: IntegrationCalendar[]): Promise<EventBusyDate[]>;
    listCalendars: () => Promise<IntegrationCalendar[]>;
    private translateEvent;
    private translateAttendees;
}
//# sourceMappingURL=CalendarService.d.ts.map