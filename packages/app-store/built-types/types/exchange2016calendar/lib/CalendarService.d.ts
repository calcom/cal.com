import type { Calendar, CalendarEvent, EventBusyDate, IntegrationCalendar, NewCalendarEventType } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
export default class ExchangeCalendarService implements Calendar {
    private url;
    private integrationName;
    private log;
    private readonly exchangeVersion;
    private credentials;
    constructor(credential: CredentialPayload);
    createEvent(event: CalendarEvent): Promise<NewCalendarEventType>;
    updateEvent(uid: string, event: CalendarEvent): Promise<any>;
    deleteEvent(uid: string): Promise<void>;
    getAvailability(dateFrom: string, dateTo: string, selectedCalendars: IntegrationCalendar[]): Promise<EventBusyDate[]>;
    listCalendars(): Promise<IntegrationCalendar[]>;
    private getExchangeService;
}
//# sourceMappingURL=CalendarService.d.ts.map