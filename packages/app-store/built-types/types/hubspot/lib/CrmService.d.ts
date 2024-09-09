import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { CRM, ContactCreateInput, Contact, CrmEvent } from "@calcom/types/CrmService";
export default class HubspotCalendarService implements CRM {
    private url;
    private integrationName;
    private auth;
    private log;
    private client_id;
    private client_secret;
    constructor(credential: CredentialPayload);
    private getHubspotMeetingBody;
    private hubspotCreateMeeting;
    private hubspotAssociate;
    private hubspotUpdateMeeting;
    private hubspotDeleteMeeting;
    private hubspotAuth;
    handleMeetingCreation(event: CalendarEvent, contacts: Contact[]): Promise<{
        uid: string;
        id: string;
        type: string;
        password: string;
        url: string;
        additionalInfo: {
            contacts: Contact[];
            associatedMeeting: import("@hubspot/api-client/lib/codegen/crm/associations").BatchResponsePublicAssociation;
        };
    }>;
    createEvent(event: CalendarEvent, contacts: Contact[]): Promise<CrmEvent>;
    updateEvent(uid: string, event: CalendarEvent): Promise<any>;
    deleteEvent(uid: string): Promise<void>;
    getContacts(emails: string | string[]): Promise<Contact[]>;
    createContacts(contactsToCreate: ContactCreateInput[]): Promise<Contact[]>;
}
//# sourceMappingURL=CrmService.d.ts.map