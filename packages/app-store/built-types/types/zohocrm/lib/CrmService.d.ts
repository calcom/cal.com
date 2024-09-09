import type { CalendarEvent, NewCalendarEventType } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { CRM, Contact, ContactCreateInput } from "@calcom/types/CrmService";
export type ZohoToken = {
    scope: string;
    api_domain: string;
    expires_in: number;
    expiryDate: number;
    token_type: string;
    access_token: string;
    accountServer: string;
    refresh_token: string;
};
export type ZohoContact = {
    id: string;
    email: string;
};
export default class ZohoCrmCrmService implements CRM {
    private integrationName;
    private auth;
    private log;
    private client_id;
    private client_secret;
    private accessToken;
    constructor(credential: CredentialPayload);
    createContacts(contactsToCreate: ContactCreateInput[]): Promise<any>;
    getContacts(emails: string | string[]): Promise<any>;
    private getMeetingBody;
    private createZohoEvent;
    private updateMeeting;
    private deleteMeeting;
    private zohoCrmAuth;
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
}
//# sourceMappingURL=CrmService.d.ts.map