import { getLocation } from "@calcom/lib/CalEventParser";
import type { CalendarEvent, NewCalendarEventType, Person } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import type { ContactSearchResult } from "../../_utils/crms/RevertCRMAppService";
import RevertCRMAppService from "../../_utils/crms/RevertCRMAppService";
import appConfig from "../config.json";

export default class HubSpotAppService extends RevertCRMAppService {
  constructor(credential: CredentialPayload) {
    super(credential);
    this.log = this.log.getSubLogger({ prefix: [appConfig.slug] });
    this.appSlug = appConfig.slug;
  }

  protected contactSearch = async (event: CalendarEvent) => {
    const headers = new Headers();
    headers.append("x-revert-api-token", this.revertApiKey);
    headers.append("x-revert-t-id", this.tenantId);
    headers.append("Content-Type", "application/json");

    const bodyRaw = JSON.stringify({
      searchCriteria: {
        filterGroups: event.attendees.map((attendee) => ({
          filters: [
            {
              value: attendee.email,
              propertyName: "email",
              operator: "EQ",
            },
          ],
        })),
      },
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
    const contacts = await this.contactSearch(event);

    if (contacts && contacts.results.length) {
      if (contacts.results.length === event.attendees.length) {
        // All contacts are in HubSpot CRM already.
        this.log.debug("contact:search:all", { event, contacts: contacts });
        const existingPeople = contacts.results.map((c) => {
          return {
            id: Number(c.id),
            name: `${c.firstName} ${c.lastName}`,
            email: c.email,
            timeZone: event.attendees[0].timeZone,
            language: event.attendees[0].language,
          };
        });
        return await this.handleEventCreation(event, existingPeople);
      } else {
        // Some attendees don't exist in HubSpot CRM
        // Get the existing contacts' email to filter out
        this.log.debug("contact:search:notAll", { event, contacts });
        const existingContacts = contacts.results.map((contact) => contact.email);
        this.log.debug("contact:filter:existing", { existingContacts });
        // Get non-existing contacts filtering out existing from attendees
        const nonExistingContacts: Person[] = event.attendees.filter(
          (attendee) => !existingContacts.includes(attendee.email)
        );
        this.log.debug("contact:filter:nonExisting", { nonExistingContacts });
        // Only create contacts in HubSpot CRM that were not present in the previous contact search
        const createdContacts = await this.createContacts(nonExistingContacts);
        this.log.debug("contact:created", { createdContacts });
        // Continue with event creation and association only when all contacts are present in HubSpot
        if (createdContacts[0] && createdContacts[0].status === "ok") {
          this.log.debug("contact:creation:ok");
          const existingPeople = contacts.results.map((c) => {
            return {
              id: Number(c.id),
              name: c.name,
              email: c.email,
              timeZone: nonExistingContacts[0].timeZone,
              language: nonExistingContacts[0].language,
            };
          });
          const newlyCreatedPeople = createdContacts.map((c) => {
            return {
              id: Number(c.result.id),
              name: c.result.name,
              email: c.result.email,
              timeZone: nonExistingContacts[0].timeZone,
              language: nonExistingContacts[0].language,
            };
          });
          const allContacts = existingPeople.concat(newlyCreatedPeople);
          // Ensure the order of attendees is maintained.
          allContacts.sort((a, b) => {
            const indexA = event.attendees.findIndex((c) => c.email === a.email);
            const indexB = event.attendees.findIndex((c) => c.email === b.email);
            return indexA - indexB;
          });
          return await this.handleEventCreation(event, allContacts);
        }
        return Promise.reject({
          calError: "Something went wrong when creating non-existing attendees in HubSpot CRM",
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
            id: Number(c.result.id),
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
      calError: "Something went wrong when searching/creating the attendees in HubSpot CRM",
    });
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<NewCalendarEventType> {
    const contacts = await this.contactSearch(event);

    const existingContacts = contacts.results.map((contact) => contact.email);
    const nonExistingContacts = event.attendees.filter(
      (contact) => !existingContacts.includes(contact.email)
    );
    if (nonExistingContacts && nonExistingContacts.length >= 1) {
      await this.createContacts(nonExistingContacts);
    }

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
    return Promise.reject("Something went wrong when updating a meeting in HubSpot CRM");
  }
}
