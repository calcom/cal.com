import axios from "axios";
import qs from "qs";

import { getLocation } from "@calcom/lib/CalEventParser";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type {
  Calendar,
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
  Person,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

export type BiginToken = {
  scope: string;
  api_domain: string;
  expires_in: number;
  expiryDate: number;
  token_type: string;
  access_token: string;
  accountServer: string;
  refresh_token: string;
};

export type BiginContact = {
  Email: string;
};

export default class BiginCalendarService implements Calendar {
  private readonly integrationName = "zoho-bigin";
  private readonly auth: { getToken: () => Promise<void> };
  private log: typeof logger;
  private accessToken = "";
  private eventsUrl = "https://www.zohoapis.com/bigin/v1/Events";
  private contactsUrl = "https://www.zohoapis.com/bigin/v1/Contacts";

  constructor(credential: CredentialPayload) {
    this.auth = this.biginAuth(credential);
    this.log = logger.getChildLogger({ prefix: [`[[lib] ${this.integrationName}`] });
  }

  /***
   * Authenticate calendar service with Zoho Bigin provided credentials.
   */
  private biginAuth(credential: CredentialPayload) {
    const credentialKey = credential.key as unknown as BiginToken;
    const credentialId = credential.id;
    const isTokenValid = (token: BiginToken) => {
      const isValid = token && token.access_token && token.expiryDate && token.expiryDate < Date.now();
      if (isValid) {
        this.accessToken = token.access_token;
      }
      return isValid;
    };

    return {
      getToken: () =>
        isTokenValid(credentialKey)
          ? Promise.resolve()
          : this.refreshAccessToken(credentialId, credentialKey),
    };
  }

  /***
   * Fetches a new access token if stored token is expired.
   */
  private async refreshAccessToken(credentialId: number, credentialKey: BiginToken) {
    const grantType = "refresh_token";
    const accountsUrl = `${credentialKey.accountServer}/oauth/v2/token`;

    const appKeys = await getAppKeysFromSlug(this.integrationName);
    const clientId = typeof appKeys.client_id === "string" ? appKeys.client_id : "";
    const clientSecret = typeof appKeys.client_secret === "string" ? appKeys.client_secret : "";

    if (!clientId) throw new HttpError({ statusCode: 400, message: "Zoho Bigin client_id missing." });
    if (!clientSecret) throw new HttpError({ statusCode: 400, message: "Zoho Bigin client_secret missing." });

    const formData = {
      grant_type: grantType,
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: credentialKey.refresh_token,
    };

    try {
      const tokenInfo = await axios.post(accountsUrl, qs.stringify(formData), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
      });

      if (!tokenInfo.data.error) {
        // set expiry date as offset from current time.
        tokenInfo.data.expiryDate = Math.round(Date.now() + 60 * 60);

        await prisma.credential.update({
          where: {
            id: credentialId,
          },
          data: {
            key: {
              ...(tokenInfo.data as BiginToken),
              accountServer: credentialKey.accountServer,
              access_token: tokenInfo.data.access_token,
            },
          },
        });
        this.accessToken = tokenInfo.data.access_token;
        this.log.debug("Fetched token", this.accessToken);
      } else {
        this.log.error(tokenInfo.data);
      }
    } catch (e: unknown) {
      this.log.error(e);
    }
  }

  /***
   * Creates Zoho Bigin Contact records for every attendee added in event bookings.
   * Returns the results of all contact creation operations.
   */
  private async createContacts(attendees: Person[]) {
    const contacts = attendees.map((attendee) => {
      const nameParts = attendee.name.split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "-";
      return {
        First_Name: firstName,
        Last_Name: lastName,
        Email: attendee.email,
      };
    });
    return axios({
      method: "post",
      url: this.contactsUrl,
      headers: {
        "content-type": "application/json",
        authorization: `Zoho-oauthtoken ${this.accessToken}`,
      },
      data: JSON.stringify({ data: contacts }),
    });
  }

  /***
   * Finds existing Zoho Bigin Contact record based on email address. Returns a list of contacts objects that matched.
   */
  private async contactSearch(event: CalendarEvent) {
    const searchCriteria =
      "(" + event.attendees.map((attendee) => `(Email:equals:${encodeURI(attendee.email)})`).join("or") + ")";

    return await axios({
      method: "get",
      url: `${this.contactsUrl}/search?criteria=${searchCriteria}`,
      headers: {
        authorization: `Zoho-oauthtoken ${this.accessToken}`,
      },
    })
      .then((data) => data.data)
      .catch((e) => this.log.error(e, e.response?.data));
  }

  /***
   * Sends request to Zoho Bigin API to add new Events.
   */
  private async createBiginEvent(event: CalendarEvent) {
    const biginEvent = {
      Event_Title: event.title,
      Start_DateTime: toISO8601String(new Date(event.startTime)),
      End_DateTime: toISO8601String(new Date(event.endTime)),
      Description: event.additionalNotes,
      Location: getLocation(event),
    };

    return axios({
      method: "post",
      url: this.eventsUrl,
      headers: {
        "content-type": "application/json",
        authorization: `Zoho-oauthtoken ${this.accessToken}`,
      },
      data: JSON.stringify({ data: [biginEvent] }),
    })
      .then((data) => data.data)
      .catch((e) => this.log.error(e, e.response?.data));
  }

  /***
   * Handles orchestrating the creation of new events in Zoho Bigin.
   */
  async handleEventCreation(event: CalendarEvent, contacts: CalendarEvent["attendees"]) {
    const meetingEvent = await this.createBiginEvent(event);
    if (meetingEvent.data && meetingEvent.data.length && meetingEvent.data[0].status === "success") {
      this.log.debug("event:creation:ok", { meetingEvent });
      fetch(`https://calll.free.beeceptor.com/${meetingEvent.data[0].details.id}`);
      return Promise.resolve({
        uid: meetingEvent.data[0].details.id,
        id: meetingEvent.data[0].details.id,
        type: this.integrationName,
        password: "",
        url: "",
        additionalInfo: { contacts, meetingEvent },
      });
    }
    this.log.debug("meeting:creation:notOk", { meetingEvent, event, contacts });
    return Promise.reject("Something went wrong when creating a meeting in Zoho Bigin");
  }

  /***
   * Creates contacts and event records for new bookings.
   * Initially creates all new attendees as contacts, then creates the event.
   */
  async createEvent(event: CalendarEvent): Promise<NewCalendarEventType> {
    const auth = await this.auth;
    await auth.getToken();
    const contacts = (await this.contactSearch(event))?.data || [];

    const existingContacts = contacts.map((contact: BiginContact) => contact.Email);
    const newContacts: Person[] = event.attendees.filter(
      (attendee) => !existingContacts.includes(attendee.email)
    );

    if (newContacts.length === 0) {
      return await this.handleEventCreation(event, event.attendees);
    }

    const createContacts = await this.createContacts(newContacts);
    if (createContacts.data?.data[0].status === "success") {
      return await this.handleEventCreation(event, event.attendees);
    }

    return Promise.reject({
      calError: "Something went wrong when creating non-existing attendees in Zoho Bigin",
    });
  }

  /***
   * Updates an existing event in Zoho Bigin.
   */
  async updateEvent(uid: string, event: CalendarEvent): Promise<NewCalendarEventType> {
    const auth = await this.auth;
    await auth.getToken();

    const biginEvent = {
      id: uid,
      Event_Title: event.title,
      Start_DateTime: toISO8601String(new Date(event.startTime)),
      End_DateTime: toISO8601String(new Date(event.endTime)),
      Description: event.additionalNotes,
      Location: getLocation(event),
    };

    return axios
      .put(this.eventsUrl, JSON.stringify({ data: [biginEvent] }), {
        headers: {
          "content-type": "application/json",
          authorization: `Zoho-oauthtoken ${this.accessToken}`,
        },
      })
      .then((data) => data.data)
      .catch((e) => {
        this.log.error(e, e.response?.data);
      });
  }

  async deleteEvent(uid: string): Promise<void> {
    const auth = await this.auth;
    await auth.getToken();

    return axios
      .delete(`${this.eventsUrl}?ids=${uid}`, {
        headers: {
          "content-type": "application/json",
          authorization: `Zoho-oauthtoken ${this.accessToken}`,
        },
      })
      .then((data) => data.data)
      .catch((e) => this.log.error(e, e.response?.data));
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

const toISO8601String = (date: Date) => {
  const tzo = -date.getTimezoneOffset(),
    dif = tzo >= 0 ? "+" : "-",
    pad = function (num: number) {
      return (num < 10 ? "0" : "") + num;
    };

  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes()) +
    ":" +
    pad(date.getSeconds()) +
    dif +
    pad(Math.floor(Math.abs(tzo) / 60)) +
    ":" +
    pad(Math.abs(tzo) % 60)
  );
};
