import { getLocation } from "@calcom/lib/CalEventParser";
import logger from "@calcom/lib/logger";
import type {
  Calendar,
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
  Person,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import appConfig from "../config.json";

type ContactSearchResult = {
  status: string;
  results: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    name: string;
  }>;
};

type ContactCreateResult = {
  status: string;
  result: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    name: string;
  };
};

export default class PipedriveCalendarService implements Calendar {
  private log: typeof logger;
  private tenantId: string;
  private revertApiKey: string;
  private revertApiUrl: string;
  constructor(credential: CredentialPayload) {
    this.revertApiKey = process.env.REVERT_API_KEY || "";
    this.revertApiUrl = process.env.REVERT_API_URL || "https://api.revert.dev/";
    this.tenantId = String(credential.teamId ? credential.teamId : credential.userId); // Question: Is this a reasonable assumption to be made? Get confirmation on the exact field to be used here.
    this.log = logger.getSubLogger({ prefix: [`[[lib] ${appConfig.slug}`] });
  }

  private createContacts = async (attendees: Person[]) => {
    const result = attendees.map(async (attendee) => {
      const headers = new Headers();
      headers.append("x-revert-api-token", this.revertApiKey);
      headers.append("x-revert-t-id", this.tenantId);
      headers.append("Content-Type", "application/json");

      const [firstname, lastname] = !!attendee.name ? attendee.name.split(" ") : [attendee.email, "-"];
      const bodyRaw = JSON.stringify({
        firstName: firstname,
        lastName: lastname || "-",
        email: attendee.email,
      });

      const requestOptions = {
        method: "POST",
        headers: headers,
        body: bodyRaw,
      };

      try {
        const response = await fetch(`${this.revertApiUrl}crm/contacts`, requestOptions);
        const result = (await response.json()) as ContactCreateResult;
        return result;
      } catch (error) {
        return Promise.reject(error);
      }
    });
    return await Promise.all(result);
  };

  private contactSearch = async (event: CalendarEvent) => {
    const result = event.attendees.map(async (attendee) => {
      const headers = new Headers();
      headers.append("x-revert-api-token", this.revertApiKey);
      headers.append("x-revert-t-id", this.tenantId);
      headers.append("Content-Type", "application/json");

      const bodyRaw = JSON.stringify({ searchCriteria: attendee.email });

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

  private getMeetingBody = (event: CalendarEvent): string => {
    return `<b>${event.organizer.language.translate("invitee_timezone")}:</b> ${
      event.attendees[0].timeZone
    }<br><br><b>${event.organizer.language.translate("share_additional_notes")}</b><br>${
      event.additionalNotes || "-"
    }`;
  };

  private createPipedriveEvent = async (event: CalendarEvent, contacts: CalendarEvent["attendees"]) => {
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

  private updateMeeting = async (uid: string, event: CalendarEvent) => {
    const eventPayload = {
      subject: event.title,
      startDateTime: event.startTime,
      endDateTime: event.endTime,
      description: this.getMeetingBody(event),
      location: getLocation(event),
    };
    const headers = new Headers();
    headers.append("x-revert-api-token", this.revertApiKey);
    headers.append("x-revert-t-id", this.tenantId);
    headers.append("Content-Type", "application/json");

    const eventBody = JSON.stringify(eventPayload);
    const requestOptions = {
      method: "PATCH",
      headers: headers,
      body: eventBody,
    };

    return await fetch(`${this.revertApiUrl}crm/events/${uid}`, requestOptions);
  };

  private deleteMeeting = async (uid: string) => {
    const headers = new Headers();
    headers.append("x-revert-api-token", this.revertApiKey);
    headers.append("x-revert-t-id", this.tenantId);

    const requestOptions = {
      method: "DELETE",
      headers: headers,
    };

    return await fetch(`${this.revertApiUrl}crm/events/${uid}`, requestOptions);
  };

  async handleEventCreation(event: CalendarEvent, contacts: CalendarEvent["attendees"]) {
    const meetingEvent = await (await this.createPipedriveEvent(event, contacts)).json();
    if (meetingEvent && meetingEvent.status === "ok") {
      this.log.debug("event:creation:ok", { meetingEvent });
      return Promise.resolve({
        uid: meetingEvent.result.id,
        id: meetingEvent.result.id,
        type: appConfig.slug,
        password: "",
        url: "",
        additionalInfo: { contacts, meetingEvent },
      });
    }
    this.log.debug("meeting:creation:notOk", { meetingEvent, event, contacts });
    return Promise.reject("Something went wrong when creating a meeting in PipedriveCRM");
  }

  async createEvent(event: CalendarEvent): Promise<NewCalendarEventType> {
    let contacts = await this.contactSearch(event);
    contacts = contacts.filter((c) => c.results.length >= 1);
    if (contacts && contacts.length) {
      if (contacts.length === event.attendees.length) {
        // all contacts are in Pipedrive CRM already.
        this.log.debug("contact:search:all", { event, contacts: contacts });
        const existingPeople = contacts.map((c) => {
          return {
            id: Number(c.results[0].id),
            name: `${c.results[0].firstName} ${c.results[0].lastName}`,
            email: c.results[0].email,
            timeZone: event.attendees[0].timeZone,
            language: event.attendees[0].language,
          };
        });
        return await this.handleEventCreation(event, existingPeople);
      } else {
        // Some attendees don't exist in PipedriveCRM
        // Get the existing contacts' email to filter out
        this.log.debug("contact:search:notAll", { event, contacts });
        const existingContacts = contacts.map((contact) => contact.results[0].email);
        this.log.debug("contact:filter:existing", { existingContacts });
        // Get non existing contacts filtering out existing from attendees
        const nonExistingContacts: Person[] = event.attendees.filter(
          (attendee) => !existingContacts.includes(attendee.email)
        );
        this.log.debug("contact:filter:nonExisting", { nonExistingContacts });
        // Only create contacts in PipedriveCRM that were not present in the previous contact search
        const createdContacts = await this.createContacts(nonExistingContacts);
        this.log.debug("contact:created", { createdContacts });
        // Continue with event creation and association only when all contacts are present in Pipedrive
        if (createdContacts[0] && createdContacts[0].status === "ok") {
          this.log.debug("contact:creation:ok");
          const existingPeople = contacts.map((c) => {
            return {
              id: Number(c.results[0].id),
              name: c.results[0].name,
              email: c.results[0].email,
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
          // ensure the order of attendees is maintained.
          allContacts.sort((a, b) => {
            const indexA = event.attendees.findIndex((c) => c.email === a.email);
            const indexB = event.attendees.findIndex((c) => c.email === b.email);
            return indexA - indexB;
          });
          return await this.handleEventCreation(event, allContacts);
        }
        return Promise.reject({
          calError: "Something went wrong when creating non-existing attendees in PipedriveCRM",
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
      calError: "Something went wrong when searching/creating the attendees in PipedriveCRM",
    });
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<NewCalendarEventType> {
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
    return Promise.reject("Something went wrong when updating a meeting in PipedriveCRM");
  }

  async deleteEvent(uid: string): Promise<void> {
    await this.deleteMeeting(uid);
  }

  async getAvailability(
    _dateFrom: string,
    _dateTo: string,
    _selectedCalendars: IntegrationCalendar[]
  ): Promise<EventBusyDate[]> {
    return Promise.resolve([]);
  }

  async listCalendars(_event?: CalendarEvent): Promise<IntegrationCalendar[]> {
    return Promise.resolve([]);
  }
}
