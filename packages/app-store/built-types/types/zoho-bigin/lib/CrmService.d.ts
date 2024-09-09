import type { CalendarEvent, EventBusyDate, IntegrationCalendar, NewCalendarEventType } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { Contact, ContactCreateInput, CRM } from "@calcom/types/CrmService";
export type BiginToken = {
    scope: string;
    api_domain: string;
    expires_in: number;
    expiryDate: number;
    token_type: string;
    access_token: string;
    accountServer: string;
    refresh_token: string;
};
export type BiginContact = {
    id: string;
    email: string;
};
export default class BiginCrmService implements CRM {
    private readonly integrationName;
    private readonly auth;
    private log;
    private eventsSlug;
    private contactsSlug;
    constructor(credential: CredentialPayload);
    /***
     * Authenticate calendar service with Zoho Bigin provided credentials.
     */
    private biginAuth;
    /***
     * Fetches a new access token if stored token is expired.
     */
    private refreshAccessToken;
    /***
     * Creates Zoho Bigin Contact records for every attendee added in event bookings.
     * Returns the results of all contact creation operations.
     */
    createContacts(contactsToCreate: ContactCreateInput[]): Promise<any>;
    /***
     * Finds existing Zoho Bigin Contact record based on email address. Returns a list of contacts objects that matched.
     */
    getContacts(emails: string | string[]): Promise<any>;
    /***
     * Sends request to Zoho Bigin API to add new Events.
     */
    private createBiginEvent;
    /***
     * Handles orchestrating the creation of new events in Zoho Bigin.
     */
    handleEventCreation(event: CalendarEvent, contacts: Contact[]): Promise<{
        uid: any;
        id: any;
        externalCalendarId: string;
        type: string;
        password: string;
        url: string;
        additionalInfo: {
            contacts: Contact[];
            meetingEvent: any;
        };
    }>;
    /***
     * Creates contacts and event records for new bookings.
     * Initially creates all new attendees as contacts, then creates the event.
     */
    createEvent(event: CalendarEvent, contacts: Contact[]): Promise<NewCalendarEventType>;
    /***
     * Updates an existing event in Zoho Bigin.
     */
    updateEvent(uid: string, event: CalendarEvent): Promise<NewCalendarEventType>;
    deleteEvent(uid: string): Promise<void>;
    getAvailability(_dateFrom: string, _dateTo: string, _selectedCalendars: IntegrationCalendar[]): Promise<EventBusyDate[]>;
    listCalendars(_event?: CalendarEvent): Promise<IntegrationCalendar[]>;
}
//# sourceMappingURL=CrmService.d.ts.map