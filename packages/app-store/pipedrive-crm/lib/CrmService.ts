import { getLocation } from "@calcom/lib/CalEventParser";
import logger from "@calcom/lib/logger";
import type {
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { ContactCreateInput, CRM, Contact } from "@calcom/types/CrmService";

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

export default class PipedriveCrmService implements CRM {
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

  async createContacts(contactsToCreate: ContactCreateInput[]): Promise<Contact[]> {
    const result = contactsToCreate.map(async (attendee) => {
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

    const results = await Promise.all(result);
    return results.map((result) => result.result);
  }

  async getContacts({ emails }: { emails: string | string[] }): Promise<Contact[]> {
    const emailArray = Array.isArray(emails) ? emails : [emails];

    const result = emailArray.map(async (attendeeEmail) => {
      const headers = new Headers();
      headers.append("x-revert-api-token", this.revertApiKey);
      headers.append("x-revert-t-id", this.tenantId);
      headers.append("Content-Type", "application/json");

      const bodyRaw = JSON.stringify({ searchCriteria: attendeeEmail });

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
    const results = await Promise.all(result);
    return results[0].results;
  }

  private getMeetingBody = (event: CalendarEvent): string => {
    return `<b>${event.organizer.language.translate("invitee_timezone")}:</b> ${
      event.attendees[0].timeZone
    }<br><br><b>${event.organizer.language.translate("share_additional_notes")}</b><br>${
      event.additionalNotes || "-"
    }`;
  };

  private createPipedriveEvent = async (event: CalendarEvent, contacts: Contact[]) => {
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

  async handleEventCreation(event: CalendarEvent, contacts: Contact[]) {
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

  async createEvent(event: CalendarEvent, contacts: Contact[]): Promise<NewCalendarEventType> {
    return await this.handleEventCreation(event, contacts);
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

  getAppOptions() {
    console.log("No options implemented");
  }

  async handleAttendeeNoShow() {
    console.log("Not implemented");
  }
}
