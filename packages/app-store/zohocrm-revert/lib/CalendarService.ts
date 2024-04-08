import { getLocation } from "@calcom/lib/CalEventParser";
import type { CalendarEvent, NewCalendarEventType, Person } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import type { ContactSearchResult } from "../../_utils/crms/RevertCRMAppService";
import RevertCRMAppService from "../../_utils/crms/RevertCRMAppService";
import appConfig from "../config.json";

export default class ZohoCRMAppService extends RevertCRMAppService {
  constructor(credential: CredentialPayload) {
    super(credential);
    this.log = this.log.getSubLogger({ prefix: [appConfig.slug] });
    this.appSlug = appConfig.slug;
  }

  protected contactSearch = async (event: CalendarEvent) => {
    const result = event.attendees.map(async (attendee) => {
      const headers = new Headers();
      headers.append("x-revert-api-token", this.revertApiKey);
      headers.append("x-revert-t-id", this.tenantId);
      headers.append("Content-Type", "application/json");

      const bodyRaw = JSON.stringify({
        searchCriteria: `(Email:equals:${attendee.email})`,
      });

      const requestOptions = {
        method: "POST",
        headers: headers,
        body: bodyRaw,
      };

      try {
        const response = await fetch(`${this.revertApiUrl}crm/contacts/search`, requestOptions);
        const result = (await response.json()) as ContactSearchResult;
        return result;
      } catch (error) {
        return { status: "error", results: [] };
      }
    });
    return await Promise.all(result);
  };

  protected createCRMEvent = async (event: CalendarEvent, contacts: CalendarEvent["attendees"]) => {
    const eventPayload = {
      subject: event.title,
      startDateTime: event.startTime,
      endDateTime: event.endTime,
      description: this.getMeetingBody(event),
      location: getLocation(event),
      associations: {
        contactId: String(contacts[0].id),
      },
    };
    const headers = new Headers();
    headers.append("x-revert-api-token", this.revertApiKey);
    headers.append("x-revert-t-id", this.tenantId);
    headers.append("Content-Type", "application/json");

    const eventBody = JSON.stringify(eventPayload);
    const requestOptions = {
      method: "POST",
      headers: headers,
      body: eventBody,
    };

    return await fetch(`${this.revertApiUrl}crm/events`, requestOptions);
  };

  async createEvent(event: CalendarEvent): Promise<NewCalendarEventType> {
    let contacts = await this.contactSearch(event);

    contacts = contacts.filter((c) => c.status !== "error" && c.results && c.results.length >= 1);

    if (contacts && contacts.length >= 1 && contacts[0].results) {
      if (contacts.length === event.attendees.length) {
        // all contacts are in ZOHO CRM already.
        this.log.debug("contact:search:all", { event, contacts: contacts });
        const existingPeople = contacts.map((c) => {
          return {
            id: c.results[0].id,
            name: `${c.results[0].firstName} ${c.results[0].lastName}`,
            email: c.results[0].email,
            timeZone: event.attendees[0].timeZone,
            language: event.attendees[0].language,
          };
        });
        return await this.handleEventCreation(event, existingPeople);
      } else {
        // Some attendees don't exist in Zoho CRM
        // Get the existing contacts' email to filter out
        this.log.debug("contact:search:notAll", { event, contacts });
        const existingContacts = contacts.map((contact) => contact.results[0].email);
        this.log.debug("contact:filter:existing", { existingContacts });
        // Get non existing contacts filtering out existing from attendees
        const nonExistingContacts: Person[] = event.attendees.filter(
          (attendee) => !existingContacts.includes(attendee.email)
        );
        this.log.debug("contact:filter:nonExisting", { nonExistingContacts });
        // Only create contacts in Zoho crm that were not present in the previous contact search
        const createdContacts = await this.createContacts(nonExistingContacts);
        this.log.debug("contact:created", { createdContacts });
        // Continue with event creation and association only when all contacts are present in zoho crm
        if (createdContacts[0] && createdContacts[0].status === "ok") {
          this.log.debug("contact:creation:ok");
          const existingPeople = contacts.map((c) => {
            return {
              id: c.results[0].id,
              name: c.results[0].name,
              email: c.results[0].email,
              timeZone: nonExistingContacts[0].timeZone,
              language: nonExistingContacts[0].language,
            };
          });
          const newlyCreatedPeople = createdContacts.map((c) => {
            return {
              id: c.result.id,
              name: c.result.name,
              email: c.result.email,
              timeZone: nonExistingContacts[0].timeZone,
              language: nonExistingContacts[0].language,
            };
          });
          const allContacts = existingPeople.concat(newlyCreatedPeople);
          // ensure the order of attendees is maintained.
          allContacts.sort((a, b) => {
            const indexA = event.attendees.findIndex((c) => c.email === a.email);
            const indexB = event.attendees.findIndex((c) => c.email === b.email);
            return indexA - indexB;
          });
          return await this.handleEventCreation(event, allContacts);
        }
        return Promise.reject({
          calError: "Something went wrong when creating non-existing attendees in ZOHO CRM",
        });
      }
    } else {
      this.log.debug("contact:search:none", { event, contacts });
      const createdContacts = await this.createContacts(event.attendees);
      this.log.debug("contact:created", { createdContacts });
      if (createdContacts[0] && createdContacts[0].status === "ok") {
        this.log.debug("contact:creation:ok");

        const newContacts = createdContacts.map((c) => {
          return {
            id: c.result.id,
            name: c.result.name,
            email: c.result.email,
            timeZone: event.attendees[0].timeZone,
            language: event.attendees[0].language,
          };
        });

        return await this.handleEventCreation(event, newContacts);
      }
    }
    return Promise.reject({
      calError: "Something went wrong when searching/creating the attendees in ZOHO CRM",
    });
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<NewCalendarEventType> {
    let contacts = await this.contactSearch(event);
    contacts = contacts.filter((c) => c.results.length >= 1);
    //store emails only
    const existingContacts = contacts.map((contact) => contact.results[0].email);

    const nonExistingContacts = event.attendees.filter(
      (attendee) => !existingContacts.includes(attendee.email)
    );

    await this.createContacts(nonExistingContacts);

    const meetingEvent = await (await this.updateMeeting(uid, event)).json();
    if (meetingEvent && meetingEvent.status === "ok") {
      this.log.debug("event:updation:ok", { meetingEvent });
      return Promise.resolve({
        uid: meetingEvent.result.id,
        id: meetingEvent.result.id,
        type: appConfig.slug,
        password: "",
        url: "",
        additionalInfo: { meetingEvent },
      });
    }
    this.log.debug("meeting:updation:notOk", { meetingEvent, event });
    return Promise.reject("Something went wrong when updating a meeting in ZOHO CRM");
  }
}
