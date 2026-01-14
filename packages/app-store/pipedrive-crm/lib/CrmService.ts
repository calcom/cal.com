import { getLocation } from "@calcom/lib/CalEventParser";
import getLabelValueMapFromResponses from "@calcom/lib/getLabelValueMapFromResponses";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type {
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { ContactCreateInput, CRM, Contact } from "@calcom/types/CrmService";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import refreshOAuthTokens from "../../_utils/oauth/refreshOAuthTokens";
import type { PipedriveToken } from "../api/callback";
import appConfig from "../config.json";
import { PipedriveApiClient } from "./PipedriveApiClient";

export default class PipedriveCrmService implements CRM {
  private log: typeof logger;
  private auth: Promise<{ getToken: () => Promise<PipedriveToken | void | never[]> }>;
  private client_id = "";
  private client_secret = "";
  private apiUrl = "";
  private apiClient: PipedriveApiClient | null = null;
  private credentialId: number;

  constructor(credential: CredentialPayload) {
    this.credentialId = credential.id;
    this.auth = this.pipedriveAuth(credential).then((r) => r);
    this.log = logger.getSubLogger({ prefix: [`[[lib] ${appConfig.slug}`] });
  }

  private pipedriveAuth = async (credential: CredentialPayload) => {
    const appKeys = await getAppKeysFromSlug(appConfig.slug);
    if (typeof appKeys.client_id === "string") this.client_id = appKeys.client_id;
    if (typeof appKeys.client_secret === "string") this.client_secret = appKeys.client_secret;

    if (!this.client_id) throw new HttpError({ statusCode: 400, message: "Pipedrive client_id missing." });
    if (!this.client_secret)
      throw new HttpError({ statusCode: 400, message: "Pipedrive client_secret missing." });

    const credentialKey = credential.key as unknown as PipedriveToken;
    this.apiUrl = credentialKey.api_domain
      ? credentialKey.api_domain + "/api/v2"
      : "https://api.pipedrive.com/api/v2";

    // Initialize API client
    this.apiClient = new PipedriveApiClient(this.apiUrl, () => this.getAccessToken());

    const isTokenValid = (token: PipedriveToken) =>
      token && token.access_token && token.expiryDate && token.expiryDate > Date.now();

    const refreshAccessToken = async (refreshToken: string) => {
      try {
        const pipedriveRefreshToken: PipedriveToken = await refreshOAuthTokens(
          async () => {
            const response = await fetch("https://oauth.pipedrive.com/oauth/token", {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: refreshToken,
                client_id: this.client_id,
                client_secret: this.client_secret,
              }),
            });

            if (!response.ok) {
              throw new Error("Failed to refresh Pipedrive token");
            }

            return await response.json();
          },
          appConfig.slug,
          credential.userId
        );

        // Set expiry date as offset from current time
        pipedriveRefreshToken.expiryDate = Math.round(Date.now() + pipedriveRefreshToken.expires_in * 1000);

        await prisma.credential.update({
          where: {
            id: credential.id,
          },
          data: {
            key: pipedriveRefreshToken as any,
          },
        });

        this.apiUrl = pipedriveRefreshToken.api_domain
          ? pipedriveRefreshToken.api_domain + "/v2"
          : this.apiUrl;
      } catch (e: unknown) {
        this.log.error(e);
      }
    };

    return {
      getToken: () => {
        const tokenValid = !isTokenValid(credentialKey);
        console.log("Cred key", credentialKey);
        console.log("Token valid:", !tokenValid);

        return tokenValid ? refreshAccessToken(credentialKey.refresh_token) : Promise.resolve([]);
      },
    };
  };

  private async getAccessToken(): Promise<string> {
    const auth = await this.auth;
    await auth.getToken();

    const credential = await prisma.credential.findFirst({
      where: {
        id: this.credentialId,
      },
    });

    const credentialKey = credential?.key as unknown as PipedriveToken;
    const accessToken = credentialKey?.access_token;

    if (!accessToken) {
      throw new HttpError({ statusCode: 401, message: "No access token available" });
    }

    return accessToken;
  }

  private getClient(): PipedriveApiClient {
    if (!this.apiClient) {
      throw new HttpError({ statusCode: 500, message: "API client not initialized" });
    }
    return this.apiClient;
  }

  private getPipedriveMeetingBody = (event: CalendarEvent): string => {
    const userFields = getLabelValueMapFromResponses(event);
    const plainText = event?.description?.replace(/<\/?[^>]+(>|$)/g, "").replace(/_/g, " ");
    const location = getLocation(event);

    const userFieldsText = Object.entries(userFields)
      .map(([key, value]) => {
        const formattedValue = typeof value === "boolean" ? (value ? "Yes" : "No") : value || "-";
        return `${event.organizer.language.translate(key)}: ${formattedValue}`;
      })
      .join("\n\n");

    return `${event.organizer.language.translate("invitee_timezone")}: ${event.attendees[0].timeZone}\n\n${
      event.additionalNotes
        ? `${event.organizer.language.translate("share_additional_notes")}\n${event.additionalNotes}\n\n`
        : ""
    }${userFieldsText}\n\n${event.organizer.language.translate("where")}: ${location}${
      plainText ? `\n\n${event.organizer.language.translate("description")}\n${plainText}` : ""
    }`;
  };

  private formatDateTimeUTC(date: string) {
    const d = new Date(date);

    const dateStr =
      `${d.getUTCFullYear()}-` +
      `${String(d.getUTCMonth() + 1).padStart(2, "0")}-` +
      `${String(d.getUTCDate()).padStart(2, "0")}`;

    const timeStr =
      `${String(d.getUTCHours()).padStart(2, "0")}:` + `${String(d.getUTCMinutes()).padStart(2, "0")}`;

    return { date: dateStr, time: timeStr };
  }
  private calculateDuration(startTime: string, endTime: string): string {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  private async createPipedriveActivity(event: CalendarEvent, contacts: Contact[]) {
    const client = this.getClient();
    const { date, time } = this.formatDateTimeUTC(event.startTime);
    const duration = this.calculateDuration(event.startTime, event.endTime);

    const location = getLocation(event);

    const activityPayload = {
      subject: event.title,
      due_date: date,
      due_time: time,
      duration: duration,
      note: this.getPipedriveMeetingBody(event),
      location: location.length > 0 ? [location] : [],
      participants: [
        {
          person_id: Number(contacts[0].id),
          primary: true,
        },
      ],
      type: "meeting",
      busy: true,
    };

    console.log("Activity payload:", activityPayload);

    try {
      const result = await client.createActivity(activityPayload);
      this.log.info("Successful activity creation", JSON.stringify(result));
      return result;
    } catch (e) {
      this.log.error("Pipedrive activity creation failed:", e);
      throw e;
    }
  }

  private async updatePipedriveActivity(uid: string, event: CalendarEvent) {
    const client = this.getClient();
    const { date, time } = this.formatDateTime(event.startTime);
    const duration = this.calculateDuration(event.startTime, event.endTime);

    const activityPayload = {
      subject: event.title,
      due_date: date,
      due_time: time,
      duration: duration,
      note: this.getPipedriveMeetingBody(event),
      location: getLocation(event),
    };

    try {
      const result = await client.updateActivity(uid, activityPayload);
      this.log.info("Successful activity update", JSON.stringify(result));
      return result;
    } catch (e) {
      this.log.error("Pipedrive activity update failed:", e);
      throw e;
    }
  }

  private async deletePipedriveActivity(uid: string) {
    const client = this.getClient();
    try {
      await client.deleteActivity(uid);
      this.log.info("Successful activity deletion");
    } catch (e) {
      this.log.error("Pipedrive activity deletion failed:", e);
      throw e;
    }
  }

  async handleMeetingCreation(event: CalendarEvent, contacts: Contact[]) {
    const meetingEvent = await this.createPipedriveActivity(event, contacts);

    if (meetingEvent.success && meetingEvent.data) {
      this.log.debug("meeting:creation:ok", { meetingEvent });
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
    return Promise.reject("Something went wrong when creating a meeting in Pipedrive");
  }

  async createEvent(event: CalendarEvent, contacts: Contact[]): Promise<NewCalendarEventType> {
    const auth = await this.auth;
    await auth.getToken();

    return await this.handleMeetingCreation(event, contacts);
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<NewCalendarEventType> {
    const auth = await this.auth;
    await auth.getToken();

    const meetingEvent = await this.updatePipedriveActivity(uid, event);

    if (meetingEvent.success && meetingEvent.data) {
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
    return Promise.reject("Something went wrong when updating a meeting in Pipedrive");
  }

  async deleteEvent(uid: string): Promise<void> {
    const auth = await this.auth;
    await auth.getToken();
    await this.deletePipedriveActivity(uid);
  }

  async getContacts({ emails }: { emails: string | string[] }): Promise<Contact[]> {
    const auth = await this.auth;
    await auth.getToken();

    const client = this.getClient();
    const emailArray = Array.isArray(emails) ? emails : [emails];
    const allContacts: Contact[] = [];

    for (const email of emailArray) {
      try {
        const response = await client.searchPersons(email);

        if (response.success && response.data?.items) {
          const contacts = response.data.items.map((item) => ({
            id: String(item.item.id),
            email: item.item.emails[0] || email,
          }));
          allContacts.push(...contacts);
        }
      } catch (error) {
        this.log.error("Error searching contacts:", error);
      }
    }

    return allContacts;
  }

  async createContacts(contactsToCreate: ContactCreateInput[]): Promise<Contact[]> {
    const auth = await this.auth;
    await auth.getToken();

    const client = this.getClient();

    const results = await Promise.all(
      contactsToCreate.map(async (attendee) => {
        const [firstName, lastName] = attendee.name ? attendee.name.split(" ") : [attendee.email, ""];

        try {
          const response = await client.createPerson({
            name: attendee.name || firstName + (lastName ?? ""),
            emails: [
              {
                value: attendee.email,
                label: "work",
                primary: true,
              },
            ],
            phones: attendee.phoneNumber
              ? [
                  {
                    value: attendee.phoneNumber,
                    primary: true,
                  },
                ]
              : [],
          });

          if (response.success && response.data) {
            return {
              id: String(response.data.id),
              email: response.data.emails[0]?.value || attendee.email,
            };
          }
          throw new Error("Failed to create contact");
        } catch (error: any) {
          // Handle case where contact already exists
          if (error?.message?.includes("already exists")) {
            // Try to find the existing contact
            const existingContacts = await this.getContacts({ emails: attendee.email });
            if (existingContacts.length > 0) {
              return existingContacts[0];
            }
          }
          this.log.error("Error creating contact:", error);
          throw error;
        }
      })
    );

    return results;
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
    // Pipedrive does not support attendee no show handling.
    // Could probably be done via notes etc.
    console.log("Pipedrive: Attendee no show is not implemented");
  }
}
