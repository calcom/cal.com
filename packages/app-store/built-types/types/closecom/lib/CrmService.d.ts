import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { CRM, ContactCreateInput, CrmEvent, Contact } from "@calcom/types/CrmService";
/**
 * Authentication
 * Close.com requires Basic Auth for any request to their APIs, which is far from
 * ideal considering that such a strategy requires generating an API Key by the
 * user and input it in our system. A Setup page was created when trying to install
 * Close.com App in order to instruct how to create such resource and to obtain it.
 *
 * Meeting creation
 * Close.com does not expose a "Meeting" API, it may be available in the future.
 *
 * Per Close.com documentation (https://developer.close.com/resources/custom-activities):
 * "To work with Custom Activities, you will need to create a Custom Activity Type and
 * likely add one or more Activity Custom Fields to that type. Once the Custom Activity
 * Type is defined, you can create Custom Activity instances of that type as you would
 * any other activity."
 *
 * Contact creation
 * Every contact in Close.com need to belong to a Lead. When creating a contact in
 * Close.com as part of this integration, a new generic Lead will be created in order
 * to assign every contact created by this process, and it is named "From Cal.com"
 */
export default class CloseComCRMService implements CRM {
    private integrationName;
    private closeCom;
    private log;
    constructor(credential: CredentialPayload);
    closeComUpdateCustomActivity: (uid: string, event: CalendarEvent) => Promise<{
        api_create_only: boolean;
        created_by: string;
        date_created: string;
        date_updated: string;
        description: string;
        editable_with_roles: string[];
        fields: {
            id: string;
            name: string;
            description: string;
            type: string;
            choices?: string[] | undefined;
            accepts_multiple_values: boolean;
            editable_with_roles: string[];
            date_created: string;
            date_updated: string;
            created_by: string;
            updated_by: string;
            organization_id: string;
            custom_activity_type_id: string;
        }[];
        id: string;
        name: string;
        organization_id: string;
        updated_by: string;
    }>;
    closeComDeleteCustomActivity: (uid: string) => Promise<any>;
    createEvent(event: CalendarEvent): Promise<CrmEvent>;
    updateEvent(uid: string, event: CalendarEvent): Promise<CrmEvent>;
    deleteEvent(uid: string): Promise<void>;
    getContacts(emails: string | string[]): Promise<Contact[]>;
    createContacts(contactsToCreate: ContactCreateInput[]): Promise<Contact[]>;
}
//# sourceMappingURL=CrmService.d.ts.map