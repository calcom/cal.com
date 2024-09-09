import type { calendar_v3 } from "googleapis";
import type { Calendar, CalendarEvent, EventBusyDate, IntegrationCalendar, NewCalendarEventType } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
/** Expand the start date to the start of the month */
export declare function getTimeMin(timeMin: string): string;
/** Expand the end date to the end of the month */
export declare function getTimeMax(timeMax: string): string;
export default class GoogleCalendarService implements Calendar {
    private integrationName;
    private auth;
    private log;
    private credential;
    private myGoogleAuth;
    private oAuthManagerInstance;
    constructor(credential: CredentialPayload);
    private getMyGoogleAuthSingleton;
    private initGoogleAuth;
    authedCalendar: () => Promise<calendar_v3.Calendar>;
    private getAttendees;
    createEvent(calEventRaw: CalendarEvent, credentialId: number): Promise<NewCalendarEventType>;
    getFirstEventInRecurrence(recurringEventId: string | null | undefined, selectedCalendar: string, calendar: calendar_v3.Calendar): Promise<calendar_v3.Schema$Event>;
    updateEvent(uid: string, event: CalendarEvent, externalCalendarId: string): Promise<any>;
    deleteEvent(uid: string, event: CalendarEvent, externalCalendarId?: string | null): Promise<void>;
    getCacheOrFetchAvailability(args: {
        timeMin: string;
        timeMax: string;
        items: {
            id: string;
        }[];
    }): Promise<EventBusyDate[] | null>;
    getAvailability(dateFrom: string, dateTo: string, selectedCalendars: IntegrationCalendar[]): Promise<EventBusyDate[]>;
    listCalendars(): Promise<IntegrationCalendar[]>;
}
//# sourceMappingURL=CalendarService.d.ts.map