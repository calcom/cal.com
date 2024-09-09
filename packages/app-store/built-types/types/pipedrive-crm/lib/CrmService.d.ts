import type { CalendarEvent, EventBusyDate, IntegrationCalendar, NewCalendarEventType } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { ContactCreateInput, CRM, Contact } from "@calcom/types/CrmService";
export default class PipedriveCrmService implements CRM {
    private log;
    private tenantId;
    private revertApiKey;
    private revertApiUrl;
    constructor(credential: CredentialPayload);
    createContacts(contactsToCreate: ContactCreateInput[]): Promise<Contact[]>;
    getContacts(email: string | string[]): Promise<Contact[]>;
    private getMeetingBody;
    private createPipedriveEvent;
    private updateMeeting;
    private deleteMeeting;
    handleEventCreation(event: CalendarEvent, contacts: Contact[]): Promise<{
        uid: any;
        id: any;
        type: string;
        password: string;
        url: string;
        additionalInfo: {
            contacts: Contact[];
            meetingEvent: any;
        };
    }>;
    createEvent(event: CalendarEvent, contacts: Contact[]): Promise<NewCalendarEventType>;
    updateEvent(uid: string, event: CalendarEvent): Promise<NewCalendarEventType>;
    deleteEvent(uid: string): Promise<void>;
    getAvailability(_dateFrom: string, _dateTo: string, _selectedCalendars: IntegrationCalendar[]): Promise<EventBusyDate[]>;
    listCalendars(_event?: CalendarEvent): Promise<IntegrationCalendar[]>;
}
//# sourceMappingURL=CrmService.d.ts.map