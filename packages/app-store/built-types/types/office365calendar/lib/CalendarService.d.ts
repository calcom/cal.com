import type { Calendar, CalendarEvent, EventBusyDate, IntegrationCalendar, NewCalendarEventType } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
export default class Office365CalendarService implements Calendar {
    private url;
    private integrationName;
    private log;
    private auth;
    private apiGraphUrl;
    private credential;
    constructor(credential: CredentialPayload);
    createEvent(event: CalendarEvent, credentialId: number): Promise<NewCalendarEventType>;
    updateEvent(uid: string, event: CalendarEvent): Promise<NewCalendarEventType>;
    deleteEvent(uid: string): Promise<void>;
    getAvailability(dateFrom: string, dateTo: string, selectedCalendars: IntegrationCalendar[]): Promise<EventBusyDate[]>;
    listCalendars(): Promise<IntegrationCalendar[]>;
    private translateEvent;
    private fetcher;
    private fetchResponsesWithNextLink;
    private fetchRequestWithRetryAfter;
    private apiGraphBatchCall;
    private handleTextJsonResponseWithHtmlInBody;
    private findRetryAfterResponse;
    private processBusyTimes;
    private handleErrorJsonOffice365Calendar;
}
//# sourceMappingURL=CalendarService.d.ts.map