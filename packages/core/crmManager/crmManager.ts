import getCrm from "@calcom/app-store/_utils/getCrm";
import logger from "@calcom/lib/logger";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { CRM, ContactCreateInput } from "@calcom/types/CrmService";

const log = logger.getSubLogger({ prefix: ["CrmManager"] });
export default class CrmManager {
  crmService: CRM | null | undefined = null;
  credential: CredentialPayload;
  constructor(credential: CredentialPayload) {
    this.credential = credential;
  }

  private async getCrmService(credential: CredentialPayload) {
    if (this.crmService) return this.crmService;
    const crmService = await getCrm(credential);
    this.crmService = crmService;

    if (this.crmService === null) {
      console.log("💀 Error initializing CRM service");
      log.error("CRM service initialization failed");
    }

    return crmService;
  }

  public async createEvent(event: CalendarEvent, skipContactCreation?: boolean) {
    const crmService = await this.getCrmService(this.credential);
    // First see if the attendees already exist in the crm
    let contacts = (await this.getContacts(event.attendees.map((a) => a.email))) || [];
    // Ensure that all attendees are in the crm
    if (contacts.length == event.attendees.length) {
      return await crmService?.createEvent(event, contacts);
    }

    if (skipContactCreation) return;
    // Figure out which contacts to create
    const contactsToCreate = event.attendees.filter(
      (attendee) => !contacts.some((contact) => contact.email === attendee.email)
    );
    const createdContacts = await this.createContacts(contactsToCreate);
    contacts = contacts.concat(createdContacts);
    return await crmService?.createEvent(event, contacts);
  }

  public async updateEvent(uid: string, event: CalendarEvent) {
    const crmService = await this.getCrmService(this.credential);
    return await crmService?.updateEvent(uid, event);
  }

  public async deleteEvent(uid: string) {
    const crmService = await this.getCrmService(this.credential);
    return await crmService?.deleteEvent(uid);
  }

  public async getContacts(emailOrEmails: string | string[], includeOwner?: boolean) {
    const crmService = await this.getCrmService(this.credential);
    const contacts = await crmService?.getContacts(emailOrEmails, includeOwner);
    return contacts;
  }

  public async createContacts(contactsToCreate: ContactCreateInput[]) {
    const crmService = await this.getCrmService(this.credential);
    const createdContacts = (await crmService?.createContacts(contactsToCreate)) || [];
    return createdContacts;
  }
}
