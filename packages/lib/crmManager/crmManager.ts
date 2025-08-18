import getCrm from "@calcom/app-store/_utils/getCrm";
import logger from "@calcom/lib/logger";
import type { CalendarEvent, CalEventResponses } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { CRM, ContactCreateInput } from "@calcom/types/CrmService";

const log = logger.getSubLogger({ prefix: ["CrmManager"] });
export default class CrmManager {
  crmService: CRM | null | undefined = null;
  credential: CredentialPayload;
  appOptions: any;
  constructor(credential: CredentialPayload, appOptions?: any) {
    this.credential = credential;
    this.appOptions = appOptions;
  }

  private async getCrmService(credential: CredentialPayload) {
    if (this.crmService) return this.crmService;
    const crmService = await getCrm(credential, this.appOptions);
    this.crmService = crmService;

    if (!this.crmService) {
      console.log("💀 Error initializing CRM service");
      log.error("CRM service initialization failed");
    }

    return crmService;
  }

  public async createEvent(event: CalendarEvent) {
    const crmService = await this.getCrmService(this.credential);
    if (!crmService) return;
    const { skipContactCreation = false, ignoreGuests = false } = crmService.getAppOptions() || {};
    const eventAttendees = ignoreGuests ? [event.attendees[0]] : event.attendees;
    // First see if the attendees already exist in the crm
    let contacts = (await this.getContacts({ emails: eventAttendees.map((a) => a.email) })) || [];
    // Ensure that all attendees are in the crm
    if (contacts.length == eventAttendees.length) {
      return await crmService.createEvent(event, contacts);
    }

    if (skipContactCreation) return;
    const contactSet = new Set(contacts.map((c: { email: string }) => c.email));
    // Figure out which contacts to create
    const contactsToCreate = eventAttendees.filter((attendee) => !contactSet.has(attendee.email));
    const createdContacts = await this.createContacts(
      contactsToCreate,
      event.organizer?.email,
      event.responses
    );
    contacts = contacts.concat(createdContacts);
    return await crmService.createEvent(event, contacts);
  }

  public async updateEvent(uid: string, event: CalendarEvent) {
    const crmService = await this.getCrmService(this.credential);
    return await crmService?.updateEvent(uid, event);
  }

  public async deleteEvent(uid: string, event: CalendarEvent) {
    const crmService = await this.getCrmService(this.credential);
    return await crmService?.deleteEvent(uid, event);
  }

  public async getContacts(params: {
    emails: string | string[];
    includeOwner?: boolean;
    forRoundRobinSkip?: boolean;
  }) {
    const crmService = await this.getCrmService(this.credential);
    const contacts = await crmService?.getContacts(params);
    return contacts;
  }

  public async createContacts(
    contactsToCreate: ContactCreateInput[],
    organizerEmail?: string,
    calEventResponses?: CalEventResponses | null
  ) {
    const crmService = await this.getCrmService(this.credential);
    const createdContacts =
      (await crmService?.createContacts(contactsToCreate, organizerEmail, calEventResponses)) || [];
    return createdContacts;
  }

  public async handleAttendeeNoShow(bookingUid: string, attendees: { email: string; noShow: boolean }[]) {
    const crmService = await this.getCrmService(this.credential);
    if (crmService?.handleAttendeeNoShow) {
      await crmService.handleAttendeeNoShow(bookingUid, attendees);
    }
  }
}
