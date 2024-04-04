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
    const response = await getCrm(credential);
    this.crmService = response;

    if (this.crmService === null) {
      console.log("💀 Error initializing CRM service");
      log.error("CRM service initialization failed");
    }
  }

  public async createEvent(event: CalendarEvent) {
    await this.getCrmService(this.credential);
    // First see if the attendees already exist in the crm
    let contacts = (await this.getContacts(event.attendees.map((a) => a.email))) || [];
    // Ensure that all attendees are in the crm
    if (contacts.length == event.attendees.length) {
      return await this.crmService?.createEvent(event, contacts);
    } else {
      // Figure out which contacts to create
      const contactsToCreate = event.attendees.filter(
        (attendee) => !contacts.some((contact) => contact.email === attendee.email)
      );
      const createdContacts = await this.createContacts(contactsToCreate);
      contacts = contacts.concat(createdContacts);
      return await this.crmService?.createEvent(event, contacts);
    }
  }

  public async updateEvent(uid: string, event: CalendarEvent) {
    await this.getCrmService(this.credential);
    return await this.crmService?.updateEvent(uid, event);
  }

  public async deleteEvent(uid: string) {
    await this.getCrmService(this.credential);
    return await this.crmService?.deleteEvent(uid);
  }

  public async getContacts(email: string | string[]) {
    await this.getCrmService(this.credential);
    const contacts = await this.crmService?.getContacts(email);
    return contacts;
  }

  public async createContacts(contactsToCreate: ContactCreateInput[]) {
    await this.getCrmService(this.credential);
    const createdContacts = (await this.crmService?.createContacts(contactsToCreate)) || [];
    return createdContacts;
  }
}
