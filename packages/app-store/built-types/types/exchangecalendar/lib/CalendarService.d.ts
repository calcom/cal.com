import type { Calendar, CalendarEvent, EventBusyDate, IntegrationCalendar, NewCalendarEventType } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
export default class ExchangeCalendarService implements Calendar {
    private integrationName;
    private log;
    private payload;
    constructor(credential: CredentialPayload);
    createEvent(event: CalendarEvent): Promise<NewCalendarEventType>;
    updateEvent(uid: string, event: CalendarEvent): Promise<NewCalendarEventType | NewCalendarEventType[]>;
    deleteEvent(uid: string): Promise<void>;
    getAvailability(dateFrom: string, dateTo: string, selectedCalendars: IntegrationCalendar[]): Promise<EventBusyDate[]>;
    listCalendars(): Promise<IntegrationCalendar[]>;
    private getExchangeService;
}
//# sourceMappingURL=CalendarService.d.ts.map