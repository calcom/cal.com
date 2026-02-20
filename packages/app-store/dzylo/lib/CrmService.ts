import axios from "axios";
import qs from "qs";

import { getLocation } from "@calcom/lib/CalEventParser";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import type { CalendarEvent, NewCalendarEventType } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { CRM, Contact, ContactCreateInput } from "@calcom/types/CrmService";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import refreshOAuthTokens from "../../_utils/oauth/refreshOAuthTokens";

export type DzyloToken = {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
};

export type DzyloContact = {
  id: string;
  email: string;
};

const BASE_URL = `https://cal-webhook.dzylo.com/api`;

export default class DzyloCrmService implements CRM {
  private integrationName = "";
  private auth: Promise<{ getToken: () => Promise<void> }>;
  private client_id = "";
  private client_secret = "";
  private accessToken = "";

  constructor(credential: CredentialPayload) {
    this.integrationName = "dzylo_crm";
    this.auth = this.dzyloAuth(credential).then((r) => r);
  }

  private parseContactsPayload(payload: unknown): DzyloContact[] {
    if (Array.isArray(payload)) {
      return payload.filter(Boolean) as DzyloContact[];
    }

    if (payload && typeof payload === "object") {
      const obj = payload as { data?: unknown; body?: unknown };
      if (Array.isArray(obj.data)) {
        return obj.data.filter(Boolean) as DzyloContact[];
      }

      if (typeof obj.body === "string") {
        try {
          return this.parseContactsPayload(JSON.parse(obj.body));
        } catch {
          return [];
        }
      }

      if (obj.body && typeof obj.body === "object") {
        return this.parseContactsPayload(obj.body);
      }
    }

    return [];
  }

  async createContacts(contactsToCreate: ContactCreateInput[]) {
    const auth = await this.auth;
    await auth.getToken();
    if (!contactsToCreate?.length) return [];

    const contacts = contactsToCreate.map((contactToCreate) => contactToCreate.email);
    const response = await axios({
      method: "post",
      url: `${BASE_URL}/contacts/create`,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.accessToken}`,
      },
      data: { emails: contacts },
    });

    const createdContacts = this.parseContactsPayload(response.data);
    return createdContacts.map((contact: DzyloContact) => {
      return {
        id: contact.id,
        email: contact.email,
      };
    });
  }

  async getContacts({ emails }: { emails: string | string[] }) {
    const auth = await this.auth;
    await auth.getToken();
    const contacts = Array.isArray(emails) ? emails : [emails];
    try {
      const response = await axios({
        method: "post",
        url: `${BASE_URL}/contacts/get`,
        headers: {
          authorization: `Bearer ${this.accessToken}`,
        },
        data: { emails: contacts },
      });

      const existingContacts = this.parseContactsPayload(response.data);
      return existingContacts.map((contact: DzyloContact) => {
        return {
          id: contact.id,
          email: contact.email,
        };
      });
    } catch {
      return [];
    }
  }

  private getMeetingBody = (event: CalendarEvent): string => {
    const notesLabel = event.organizer.language.translate("share_additional_notes");
    const attendeesDetails = event.attendees.length
      ? event.attendees
          .map((attendee, index) => {
            const phoneLabel = attendee.phoneNumber ? `Phone: ${attendee.phoneNumber}` : "";
            return `${index + 1}. ${attendee.name} (${attendee.email}), ${phoneLabel}`;
          })
          .join("\n")
      : "-";
    return `\n${notesLabel}\n${
      event.additionalNotes || "-"
    }\n\nAttendees\n${attendeesDetails}`;
  };

  private createDzyloEvent = async (event: CalendarEvent, _contacts: Contact[]) => {
    const dzyloEvent = {
      booking_id: event.uid,
      title: event.title,
      start_time: toEpochSecondsUTC(new Date(event.startTime)),
      end_time: toEpochSecondsUTC(new Date(event.endTime)),
      timezone: event.attendees[0]?.timeZone,
      description: this.getMeetingBody(event),
      location: getLocation(event),
      assignee_email: event.organizer.email, // Link the organizer email as meeting assignee user with same emailId
      attendee_name: event.attendees[0].name,
      attendee_email: event.attendees[0].email,
      attendee_phone: event.attendees[0].phoneNumber,
    };

    return axios({
      method: "post",
      url: `${BASE_URL}/events/create`,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.accessToken}`,
      },
      data: dzyloEvent,
    })
      .then((data) => data.data)
      .catch(() => undefined);
  };

  private updateMeeting = async (uid: string, event: CalendarEvent) => {
    const dzyloEvent = {
      id: uid,
      booking_id: event.bookingId,
      title: event.title,
      start_time: toEpochSecondsUTC(new Date(event.startTime)),
      end_time: toEpochSecondsUTC(new Date(event.endTime)),
      timezone: event.attendees[0]?.timeZone,
      description: this.getMeetingBody(event),
      location: getLocation(event),
    };
    return axios({
      method: "put",
      url: `${BASE_URL}/events/update`,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.accessToken}`,
      },
      data: dzyloEvent,
    })
      .then((data) => data.data)
      .catch(() => undefined);
  };

  private deleteMeeting = async (uid: string) => {
    return axios({
      method: "delete",
      url: `${BASE_URL}/events/update?ids=${uid}`,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.accessToken}`,
      },
    })
      .then((data) => data.data)
      .catch(() => undefined);
  };

  private dzyloAuth = async (credential: CredentialPayload) => {
    const appKeys = await getAppKeysFromSlug("dzylo");
    if (typeof appKeys.client_id === "string") this.client_id = appKeys.client_id;
    if (typeof appKeys.client_secret === "string") this.client_secret = appKeys.client_secret;
    if (!this.client_id) throw new HttpError({ statusCode: 400, message: "Dzylo Crm client key is missing." });
    if (!this.client_secret)
      throw new HttpError({ statusCode: 400, message: "Dzylo Crm client secret is missing." });
    const credentialKey = credential.key as unknown as DzyloToken;
    const isTokenValid = (token: DzyloToken) => {
      const isValid = token && token.access_token && token.expires_in && token.expires_in > Date.now();
      if (isValid) {
        this.accessToken = token.access_token;
      }
      return isValid;
    };

    const refreshAccessToken = async (credentialKey: DzyloToken) => {
      try {
        const url = `${BASE_URL}/oauth/token`;
        const formData = {
          grant_type: "refresh_token",
          client_id: this.client_id,
          client_secret: this.client_secret,
          refresh_token: credentialKey.refresh_token,
        };
        const dzyloCrmTokenInfo = await refreshOAuthTokens(
          async () =>
            await axios({
              method: "post",
              url: url,
              data: qs.stringify(formData),
              headers: {
                "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
              },
            }),
          "dzylo",
          credential.userId
        );
        if (!dzyloCrmTokenInfo.data.error) {
          await prisma.credential.update({
            where: {
              id: credential.id,
            },
            data: {
              key: {
                ...(dzyloCrmTokenInfo.data as DzyloToken),
                refresh_token: credentialKey.refresh_token,
              },
            },
          });
          this.accessToken = dzyloCrmTokenInfo.data.access_token;
        }
      } catch {
        return;
      }
    };

    return {
      getToken: () => (isTokenValid(credentialKey) ? Promise.resolve() : refreshAccessToken(credentialKey)),
    };
  };

  async handleEventCreation(event: CalendarEvent, contacts: Contact[]) {
    const meetingResult = await this.createDzyloEvent(event, contacts);

    if (meetingResult?.status && meetingResult.id) {
      return Promise.resolve({
        uid: meetingResult.id,
        id: meetingResult.id,
        type: this.integrationName,
        password: "",
        url: "",
        additionalInfo: { contacts, meetingResult },
      });
    }
    return Promise.reject("Something went wrong when creating a meeting in Dzylo CRM");
  }

  async createEvent(event: CalendarEvent, contacts: Contact[]): Promise<NewCalendarEventType> {
    const auth = await this.auth;
    await auth.getToken();
    return await this.handleEventCreation(event, contacts);
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<NewCalendarEventType> {
    const auth = await this.auth;
    await auth.getToken();
    return await this.updateMeeting(uid, event);
  }

  async deleteEvent(uid: string): Promise<void> {
    const auth = await this.auth;
    await auth.getToken();
    return await this.deleteMeeting(uid);
  }

  getAppOptions() {
  }

  async handleAttendeeNoShow() {
  }
}
const toEpochSecondsUTC = (date: Date) => {
  return Math.floor(date.getTime() / 1000);
};
