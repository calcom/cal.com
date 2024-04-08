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

export type ContactCreateResult = {
  status: string;
  result: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    name: string;
  };
};

export type ContactSearchResult = {
  status: string;
  results: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    name: string;
  }>;
};

export default abstract class RevertCRMAppService implements Calendar {
  protected log: typeof logger;
  protected tenantId: string;
  protected revertApiKey: string;
  protected revertApiUrl: string;
  protected appSlug: string;

  constructor(credential: CredentialPayload) {
    this.revertApiKey = process.env.REVERT_API_KEY || "";
    this.revertApiUrl = process.env.REVERT_API_URL || "https://api.revert.dev/";
    this.tenantId = String(credential.teamId ? credential.teamId : credential.userId);
    this.log = logger.getSubLogger({ prefix: [`[[lib]`] });
    this.appSlug = "";
  }

  protected createContacts = async (attendees: Person[]) => {
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

  protected getMeetingBody = (event: CalendarEvent): string => {
    return `<b>${event.organizer.language.translate("invitee_timezone")}:</b> ${
      event.attendees[0].timeZone
    }<br><br><b>${event.organizer.language.translate("share_additional_notes")}</b><br>${
      event.additionalNotes || "-"
    }`;
  };

  protected abstract contactSearch(
    event: CalendarEvent
  ): Promise<ContactSearchResult | ContactSearchResult[]>;

  protected abstract createCRMEvent(
    event: CalendarEvent,
    contacts: CalendarEvent["attendees"]
  ): Promise<Response>;

  protected updateMeeting = async (uid: string, event: CalendarEvent) => {
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

  protected deleteMeeting = async (uid: string) => {
    const headers = new Headers();
    headers.append("x-revert-api-token", this.revertApiKey);
    headers.append("x-revert-t-id", this.tenantId);

    const requestOptions = {
      method: "DELETE",
      headers: headers,
    };

    return await fetch(`${this.revertApiUrl}crm/events/${uid}`, requestOptions);
  };

  protected async handleEventCreation(event: CalendarEvent, contacts: CalendarEvent["attendees"]) {
    const meetingEvent = await (await this.createCRMEvent(event, contacts)).json();
    if (meetingEvent && meetingEvent.status === "ok") {
      this.log.debug("event:creation:ok", { meetingEvent });

      return Promise.resolve({
        uid: meetingEvent.result.id,
        id: meetingEvent.result.id,
        type: this.appSlug,
        password: "",
        url: "",
        additionalInfo: { contacts, meetingEvent },
      });
    }
    this.log.debug("meeting:creation:notOk", { meetingEvent, event, contacts });
    return Promise.reject("Something went wrong when creating a meeting");
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

  abstract createEvent(event: CalendarEvent): Promise<NewCalendarEventType>;

  abstract updateEvent(uid: string, event: CalendarEvent): Promise<NewCalendarEventType>;

  public async deleteEvent(uid: string): Promise<void> {
    await this.deleteMeeting(uid);
  }
}
