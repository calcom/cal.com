import type { Calendar, CalendarEvent, EventBusyDate, IntegrationCalendar, NewCalendarEventType } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
/**
 * Authentication
 * Sendgrid requires Basic Auth for any request to their APIs, which is far from
 * ideal considering that such a strategy requires generating an API Key by the
 * user and input it in our system. A Setup page was created when trying to install
 * Sendgrid in order to instruct how to create such resource and to obtain it.
 */
export default class CloseComCalendarService implements Calendar {
    private integrationName;
    private sendgrid;
    private log;
    constructor(credential: CredentialPayload);
    createEvent(event: CalendarEvent): Promise<NewCalendarEventType>;
    updateEvent(_uid: string, _event: CalendarEvent): Promise<any>;
    deleteEvent(_uid: string): Promise<void>;
    getAvailability(_dateFrom: string, _dateTo: string, _selectedCalendars: IntegrationCalendar[]): Promise<EventBusyDate[]>;
    listCalendars(_event?: CalendarEvent): Promise<IntegrationCalendar[]>;
}
//# sourceMappingURL=CalendarService.d.ts.map