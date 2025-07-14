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

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import appConfig from "../config.json";

type PipedriveContact = {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  email: Array<{ value: string; primary: boolean }>;
};

type PipedriveActivity = {
  id: number;
  subject: string;
  due_date: string;
  due_time: string;
  duration: string;
  note: string;
  location: string;
  person_id: number;
};

export default class PipedriveCrmService implements CRM {
  private log: typeof logger;
  private accessToken: string;
  private apiDomain: string;
  private refreshToken: string;
  private expiryDate: number;

  constructor(credential: CredentialPayload) {
    this.log = logger.getSubLogger({ prefix: [`[[lib] ${appConfig.slug}`] });

    const key = credential.key as any;
    this.accessToken = key.access_token;
    this.apiDomain = key.api_domain;
    this.refreshToken = key.refresh_token;
    this.expiryDate = key.expiryDate;
  }

  private async getValidAccessToken(): Promise<string> {
    if (Date.now() < this.expiryDate) {
      return this.accessToken;
    }

    try {
      const appKeys = await getAppKeysFromSlug(appConfig.slug);
      let clientId = "";
      let clientSecret = "";
      if (typeof appKeys.client_id === "string") clientId = appKeys.client_id;
      if (typeof appKeys.client_secret === "string") clientSecret = appKeys.client_secret;

      if (!clientId || !clientSecret) {
        throw new Error("Pipedrive client credentials missing for token refresh");
      }

      const authHeader = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;

      const tokenResponse = await fetch("https://oauth.pipedrive.com/oauth/token", {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: this.refreshToken,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error(`Token refresh failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
      }

      const refreshedToken = await tokenResponse.json();

      this.accessToken = refreshedToken.access_token;
      this.expiryDate = Math.round(Date.now() + refreshedToken.expires_in * 1000);

      this.log.debug("Token refreshed successfully");
      return this.accessToken;
    } catch (error) {
      this.log.error("Error refreshing access token:", error);
      throw new Error("Failed to refresh access token");
    }
  }

  async createContacts(contactsToCreate: ContactCreateInput[]): Promise<Contact[]> {
    const accessToken = await this.getValidAccessToken();

    const result = contactsToCreate.map(async (attendee) => {
      const [firstName, lastName] = !!attendee.name ? attendee.name.split(" ") : [attendee.email, ""];

      const bodyData = {
        name: attendee.name || attendee.email,
        first_name: firstName,
        last_name: lastName || "",
        email: [{ value: attendee.email, primary: true }],
      };

      try {
        const response = await fetch(`${this.apiDomain}/api/v1/persons`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyData),
        });

        const result = await response.json();
        if (result.success && result.data) {
          const contact = result.data as PipedriveContact;
          return {
            id: contact.id.toString(),
            email: contact.email[0]?.value || attendee.email,
            firstName: contact.first_name,
            lastName: contact.last_name,
            name: contact.name,
          };
        }
        throw new Error("Failed to create contact");
      } catch (error) {
        this.log.error("Error creating contact:", error);
        throw error;
      }
    });

    return await Promise.all(result);
  }

  async getContacts({ emails }: { emails: string | string[] }): Promise<Contact[]> {
    const accessToken = await this.getValidAccessToken();
    const emailArray = Array.isArray(emails) ? emails : [emails];

    const result = emailArray.map(async (email) => {
      try {
        const response = await fetch(
          `${this.apiDomain}/api/v1/persons/search?term=${encodeURIComponent(email)}&fields=email`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        const result = await response.json();
        if (result.success && result.data?.items) {
          return result.data.items.map((item: any) => {
            const contact = item.item as PipedriveContact;
            return {
              id: contact.id.toString(),
              email: contact.email[0]?.value || email,
              firstName: contact.first_name,
              lastName: contact.last_name,
              name: contact.name,
            };
          });
        }
        return [];
      } catch (error) {
        this.log.error("Error searching contacts:", error);
        return [];
      }
    });

    const results = await Promise.all(result);
    return results.flat();
  }

  private getMeetingBody = (event: CalendarEvent): string => {
    return `${event.organizer.language.translate("invitee_timezone")}: ${
      event.attendees[0].timeZone
    }\n\n${event.organizer.language.translate("share_additional_notes")}\n${event.additionalNotes || "-"}`;
  };

  private createPipedriveActivity = async (event: CalendarEvent, contacts: Contact[]) => {
    const accessToken = await this.getValidAccessToken();

    const startDate = new Date(event.startTime);
    const endDate = new Date(event.endTime);
    const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));

    const activityPayload = {
      subject: event.title,
      type: "meeting",
      due_date: startDate.toISOString().split("T")[0],
      due_time: startDate.toTimeString().split(" ")[0].substring(0, 5),
      duration: `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")}`,
      note: this.getMeetingBody(event),
      location: getLocation(event),
      person_id: parseInt(contacts[0].id),
    };

    const response = await fetch(`${this.apiDomain}/api/v1/activities`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(activityPayload),
    });

    return response;
  };

  private updateActivity = async (uid: string, event: CalendarEvent) => {
    const accessToken = await this.getValidAccessToken();

    const startDate = new Date(event.startTime);
    const endDate = new Date(event.endTime);
    const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));

    const activityPayload = {
      subject: event.title,
      due_date: startDate.toISOString().split("T")[0],
      due_time: startDate.toTimeString().split(" ")[0].substring(0, 5),
      duration: `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")}`,
      note: this.getMeetingBody(event),
      location: getLocation(event),
    };

    const response = await fetch(`${this.apiDomain}/api/v1/activities/${uid}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(activityPayload),
    });

    return response;
  };

  private deleteActivity = async (uid: string) => {
    const accessToken = await this.getValidAccessToken();

    const response = await fetch(`${this.apiDomain}/api/v1/activities/${uid}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response;
  };

  async handleEventCreation(event: CalendarEvent, contacts: Contact[]) {
    const response = await this.createPipedriveActivity(event, contacts);
    const meetingEvent = await response.json();

    if (meetingEvent.success && meetingEvent.data) {
      this.log.debug("event:creation:ok", { meetingEvent });
      return Promise.resolve({
        uid: meetingEvent.data.id.toString(),
        id: meetingEvent.data.id.toString(),
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
    const response = await this.updateActivity(uid, event);
    const meetingEvent = await response.json();

    if (meetingEvent.success && meetingEvent.data) {
      this.log.debug("event:updation:ok", { meetingEvent });
      return Promise.resolve({
        uid: meetingEvent.data.id.toString(),
        id: meetingEvent.data.id.toString(),
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
    await this.deleteActivity(uid);
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
