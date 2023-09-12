import axios from "axios";
import qs from "qs";

import { getLocation } from "@calcom/lib/CalEventParser";
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
import { appKeysSchema } from "../zod";

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
  email: string;
};

export default class BiginCalendarService implements Calendar {
  private readonly integrationName = "zoho-bigin";
  private readonly auth: { getToken: () => Promise<BiginToken> };
  private log: typeof logger;
  private eventsSlug = "/bigin/v1/Events";
  private contactsSlug = "/bigin/v1/Contacts";

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

    const isTokenValid = (token: BiginToken) =>
      token.access_token && token.expiryDate && token.expiryDate > Date.now();

    return {
      getToken: () =>
        isTokenValid(credentialKey)
          ? Promise.resolve(credentialKey)
          : this.refreshAccessToken(credentialId, credentialKey),
    };
  }

  /***
   * Fetches a new access token if stored token is expired.
   */
  private async refreshAccessToken(credentialId: number, credentialKey: BiginToken) {
    this.log.debug("Refreshing token as it's invalid");
    const grantType = "refresh_token";
    const accountsUrl = `${credentialKey.accountServer}/oauth/v2/token`;

    const appKeys = await getAppKeysFromSlug(this.integrationName);

    const { client_id: clientId, client_secret: clientSecret } = appKeysSchema.parse(appKeys);

    const formData = {
      grant_type: grantType,
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: credentialKey.refresh_token,
    };

    const tokenInfo = await axios.post(accountsUrl, qs.stringify(formData), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
    });

    if (!tokenInfo.data.error) {
      // set expiry date as offset from current time.
      tokenInfo.data.expiryDate = Math.round(Date.now() + tokenInfo.data.expires_in);
      tokenInfo.data.accountServer = credentialKey.accountServer;
      tokenInfo.data.refresh_token = credentialKey.refresh_token;

      await prisma.credential.update({
        where: {
          id: credentialId,
        },
        data: {
          key: tokenInfo.data as BiginToken,
        },
      });
      this.log.debug("Fetched token", tokenInfo.data.access_token);
    } else {
      this.log.error(tokenInfo.data);
    }

    return tokenInfo.data as BiginToken;
  }

  /***
   * Creates Zoho Bigin Contact records for every attendee added in event bookings.
   * Returns the results of all contact creation operations.
   */
  private async createContacts(attendees: Person[]) {
    const token = await this.auth.getToken();
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
      url: token.api_domain + this.contactsSlug,
      headers: {
        "content-type": "application/json",
        authorization: `Zoho-oauthtoken ${token.access_token}`,
      },
      data: JSON.stringify({ data: contacts }),
    });
  }

  /***
   * Finds existing Zoho Bigin Contact record based on email address. Returns a list of contacts objects that matched.
   */
  private async contactSearch(event: CalendarEvent) {
    const token = await this.auth.getToken();
    const searchCriteria =
      "(" + event.attendees.map((attendee) => `(Email:equals:${encodeURI(attendee.email)})`).join("or") + ")";

    return await axios({
      method: "get",
      url: `${token.api_domain}${this.contactsSlug}/search?criteria=${searchCriteria}`,
      headers: {
        authorization: `Zoho-oauthtoken ${token.access_token}`,
      },
    })
      .then((data) => data.data)
      .catch((e) => this.log.error("Error searching contact:", JSON.stringify(e), e.response?.data));
  }

  /***
   * Sends request to Zoho Bigin API to add new Events.
   */
  private async createBiginEvent(event: CalendarEvent) {
    const token = await this.auth.getToken();
    const biginEvent = {
      Event_Title: event.title,
      Start_DateTime: toISO8601String(new Date(event.startTime)),
      End_DateTime: toISO8601String(new Date(event.endTime)),
      Description: event.additionalNotes,
      Location: getLocation(event),
    };

    return axios({
      method: "post",
      url: token.api_domain + this.eventsSlug,
      headers: {
        "content-type": "application/json",
        authorization: `Zoho-oauthtoken ${token.access_token}`,
      },
      data: JSON.stringify({ data: [biginEvent] }),
    })
      .then((data) => data.data)
      .catch((e) => this.log.error("Error creating bigin event", JSON.stringify(e), e.response?.data));
  }

  /***
   * Handles orchestrating the creation of new events in Zoho Bigin.
   */
  async handleEventCreation(event: CalendarEvent, contacts: CalendarEvent["attendees"]) {
    const meetingEvent = await this.createBiginEvent(event);
    if (meetingEvent.data && meetingEvent.data.length && meetingEvent.data[0].status === "success") {
      this.log.debug("event:creation:ok", { meetingEvent });
      return Promise.resolve({
        uid: meetingEvent.data[0].details.id,
        id: meetingEvent.data[0].details.id,
        //FIXME: `externalCalendarId` is required by the `updateAllCalendarEvents` method, but is not used by zoho-bigin App. Not setting this property actually skips calling updateEvent..
        // Here the value doesn't matter. We just need to set it to something.
        externalCalendarId: "NO_CALENDAR_ID_NEEDED",
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
    const contacts = (await this.contactSearch(event))?.data || [];

    const existingContacts = contacts.map((contact: BiginContact) => contact.email);
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
    this.log.debug(`Updating Event with uid ${uid}`);
    const token = await this.auth.getToken();
    const biginEvent = {
      id: uid,
      Event_Title: event.title,
      Start_DateTime: toISO8601String(new Date(event.startTime)),
      End_DateTime: toISO8601String(new Date(event.endTime)),
      Description: event.additionalNotes,
      Location: getLocation(event),
    };

    return axios
      .put(token.api_domain + this.eventsSlug, JSON.stringify({ data: [biginEvent] }), {
        headers: {
          "content-type": "application/json",
          authorization: `Zoho-oauthtoken ${token.access_token}`,
        },
      })
      .then((data) => data.data)
      .catch((e) => {
        this.log.error("Error in updating bigin event", JSON.stringify(e), e.response?.data);
      });
  }

  async deleteEvent(uid: string): Promise<void> {
    const token = await this.auth.getToken();
    return axios
      .delete(`${token.api_domain}${this.eventsSlug}?ids=${uid}`, {
        headers: {
          "content-type": "application/json",
          authorization: `Zoho-oauthtoken ${token.access_token}`,
        },
      })
      .then((data) => data.data)
      .catch((e) => this.log.error("Error deleting bigin event", JSON.stringify(e), e.response?.data));
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
