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
import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import refreshOAuthTokens from "../../_utils/oauth/refreshOAuthTokens";
import prisma from "@calcom/prisma";

type PipedriveToken = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  expiryDate?: number;
};

export default class PipedriveCrmService implements CRM {
  private log: typeof logger;
  private auth: Promise<{ getToken: () => Promise<void> }>;

  constructor(private credential: CredentialPayload) {
    this.log = logger.getSubLogger({ prefix: [`[[lib] ${appConfig.slug}`] });
    this.auth = this.pipedriveAuth(credential).then((r) => r);
  }

  // Authenticate and ensure tokens are valid. Will refresh when needed and persist updated tokens.
  private pipedriveAuth = async (credential: CredentialPayload) => {
    const appKeys = await getAppKeysFromSlug(appConfig.slug);
    const client_id = typeof appKeys.client_id === "string" ? appKeys.client_id : "";
    const client_secret = typeof appKeys.client_secret === "string" ? appKeys.client_secret : "";
    if (!client_id) throw new Error("Pipedrive client_id missing.");
    if (!client_secret) throw new Error("Pipedrive client_secret missing.");

    let currentToken = credential.key as unknown as PipedriveToken;

    const isTokenValid = (token?: PipedriveToken) =>
      !!token && !!token.access_token && !!token.expiryDate && token.expiryDate > Date.now();

    const refreshAccessToken = async (refreshToken?: string) => {
      if (!refreshToken) return;
      try {
        const pipedriveRefresh: PipedriveToken = await refreshOAuthTokens(
          async () => {
            const params = new URLSearchParams({
              grant_type: "refresh_token",
              refresh_token: refreshToken,
              client_id,
              client_secret,
            });
            const res = await fetch("https://oauth.pipedrive.com/oauth/token", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: params.toString(),
            });
            if (!res.ok) throw new Error(`Failed to refresh pipedrive token: ${res.status}`);
            return res.json();
          },
          "pipedrive-crm",
          credential.userId
        );

        if (pipedriveRefresh.expires_in) {
          pipedriveRefresh.expiryDate = Math.round(Date.now() + pipedriveRefresh.expires_in * 1000);
        }

        await prisma.credential.update({ where: { id: credential.id }, data: { key: pipedriveRefresh as any } });
        // persist updated token in this instance for subsequent API calls
        this.credential.key = pipedriveRefresh as any;
        currentToken = { ...currentToken, ...pipedriveRefresh };
      } catch (e: unknown) {
        this.log.error(e);
      }
    };

    return {
      getToken: async () => {
        if (!isTokenValid(currentToken)) {
          await refreshAccessToken(currentToken?.refresh_token);
        }
      },
    };
  };

  // Create Pipedrive person (contact)
  async createContacts(contactsToCreate: ContactCreateInput[]): Promise<Contact[]> {
    await (await this.auth).getToken();
    const currentToken = this.credential.key as unknown as PipedriveToken;
    const results = [] as Contact[];
    for (const attendee of contactsToCreate) {
      const [firstname, lastname] = !!attendee.name ? attendee.name.split(" ") : [attendee.email, "-"];
      const name = `${firstname}${lastname && lastname !== "-" ? ` ${lastname}` : ""}`;
      const body = { name, email: attendee.email } as Record<string, unknown>;
      const res = await fetch(`https://api.pipedrive.com/v1/persons`, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create person in Pipedrive");
      const json = await res.json();
      results.push({ id: String(json.data.id), email: attendee.email, name: json.data.name } as Contact);
    }
    return results;
  }

  // Search for contact(s) by email
  async getContacts({ emails }: { emails: string | string[] }): Promise<Contact[]> {
    await (await this.auth).getToken();
    const currentToken = this.credential.key as unknown as PipedriveToken;
    const emailArray = Array.isArray(emails) ? emails : [emails];
    const contacts: Contact[] = [];
    for (const email of emailArray) {
      const res = await fetch(
        `https://api.pipedrive.com/v1/persons/search?term=${encodeURIComponent(email)}&field_key=email&exact_match=true`,
        {
          headers: { Authorization: `Bearer ${currentToken.access_token}` },
        }
      );
      if (!res.ok) continue;
      const json = await res.json();
      // search results format may vary; attempt to normalize
      const items = json.data && json.data.items ? json.data.items : [];
      if (items.length > 0) {
        const item = items[0];
        const person = item.item || item;
        contacts.push({ id: String(person.id), email, name: person.name } as Contact);
      }
    }
    return contacts;
  }

  private getMeetingBody = (event: CalendarEvent): string => {
    return `<b>${event.organizer.language.translate("invitee_timezone")}:</b> ${event.attendees[0].timeZone}<br><br><b>${event.organizer.language.translate(
      "share_additional_notes"
    )}</b><br>${event.additionalNotes || "-"}`;
  };

  // Create a Pipedrive activity (meeting)
  private createPipedriveEvent = async (event: CalendarEvent, contacts: Contact[]) => {
    await (await this.auth).getToken();
    const currentToken = this.credential.key as unknown as PipedriveToken;
    const person_id = contacts?.[0]?.id;
    const durationMin = Math.max(1, (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / 60000);
    const payload: Record<string, unknown> = {
      subject: event.title,
      type: "meeting",
      due_date: new Date(event.startTime).toISOString().split("T")[0],
      due_time: new Date(event.startTime).toISOString().split("T")[1].replace("Z", ""),
      duration: String(Math.round(durationMin)),
      note: this.getMeetingBody(event),
    };
    if (person_id) payload.person_id = Number(person_id);

    const res = await fetch(`https://api.pipedrive.com/v1/activities`, {
      method: "POST",
      headers: { Authorization: `Bearer ${currentToken.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create activity in Pipedrive");
    return res.json();
  };

  private updateMeeting = async (uid: string, event: CalendarEvent) => {
    await (await this.auth).getToken();
    const currentToken = this.credential.key as unknown as PipedriveToken;
    const payload: Record<string, unknown> = {
      subject: event.title,
      note: this.getMeetingBody(event),
    };
    const res = await fetch(`https://api.pipedrive.com/v1/activities/${uid}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${currentToken.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to update activity in Pipedrive");
    return res.json();
  };

  private deleteMeeting = async (uid: string) => {
    await (await this.auth).getToken();
    const currentToken = this.credential.key as unknown as PipedriveToken;
    await fetch(`https://api.pipedrive.com/v1/activities/${uid}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${currentToken.access_token}` },
    });
  };

  async handleEventCreation(event: CalendarEvent, contacts: Contact[]) {
    const meetingEvent = await this.createPipedriveEvent(event, contacts);
    if (meetingEvent && meetingEvent.data) {
      this.log.debug("event:creation:ok", { meetingEvent });
      return Promise.resolve({
        uid: String(meetingEvent.data.id),
        id: String(meetingEvent.data.id),
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
    const meetingEvent = await this.updateMeeting(uid, event);
    if (meetingEvent && meetingEvent.data) {
      this.log.debug("event:updation:ok", { meetingEvent });
      return Promise.resolve({
        uid: String(meetingEvent.data.id),
        id: String(meetingEvent.data.id),
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
