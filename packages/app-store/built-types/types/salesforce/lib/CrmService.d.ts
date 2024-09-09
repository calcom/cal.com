import jsforce from "jsforce";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { CRM, Contact, CrmEvent } from "@calcom/types/CrmService";
export default class SalesforceCRMService implements CRM {
    private integrationName;
    private conn;
    private log;
    private calWarnings;
    constructor(credential: CredentialPayload);
    private getClient;
    private getSalesforceUserFromEmail;
    private getSalesforceUserFromOwnerId;
    private getSalesforceEventBody;
    private salesforceCreateEventApiCall;
    private salesforceCreateEvent;
    private salesforceUpdateEvent;
    private salesforceDeleteEvent;
    handleEventCreation(event: CalendarEvent, contacts: Contact[]): Promise<{
        uid: string;
        id: string;
        type: string;
        password: string;
        url: string;
        additionalInfo: {
            contacts: Contact[];
            sfEvent: jsforce.SuccessResult;
            calWarnings: string[];
        };
    }>;
    createEvent(event: CalendarEvent, contacts: Contact[]): Promise<CrmEvent>;
    updateEvent(uid: string, event: CalendarEvent): Promise<CrmEvent>;
    deleteEvent(uid: string): Promise<void>;
    getContacts(email: string | string[], includeOwner?: boolean): Promise<{
        id: string;
        email: string;
    }[]>;
    createContacts(contactsToCreate: {
        email: string;
        name: string;
    }[], organizerEmail?: string): Promise<Contact[]>;
}
//# sourceMappingURL=CrmService.d.ts.map