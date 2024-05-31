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
import refreshOAuthTokens from "../../_utils/oauth/refreshOAuthTokens";

export type ZohoToken = {
  scope: string;
  api_domain: string;
  expires_in: number;
  expiryDate: number;
  token_type: string;
  access_token: string;
  accountServer: string;
  refresh_token: string;
};

export type ZohoContact = {
  Email: string;
};

/**
 * Converts to the date Format as required by zoho: 2020-08-02T15:30:00+05:30
 * https://www.zoho.com/crm/developer/docs/api/v2/events-response.html
 */
const toISO8601String = (date: Date) => {
  const tzo = -date.getTimezoneOffset(),
    dif = tzo >= 0 ? "+" : "-",
    pad = function (num: number) {
      return (num < 10 ? "0" : "") + num;
    };

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${dif}${pad(Math.floor(Math.abs(tzo) / 60))}:${pad(
    Math.abs(tzo) % 60
  )}`;
};
export default class ZohoCrmCalendarService implements Calendar {
  private integrationName = "";
  private auth: Promise<{ getToken: () => Promise<void> }>;
  private log: typeof logger;
  private client_id = "";
  private client_secret = "";
  private accessToken = "";

  constructor(credential: CredentialPayload) {
    this.integrationName = "zohocrm_other_calendar";
    this.auth = this.zohoCrmAuth(credential).then((r) => r);
    this.log = logger.getSubLogger({ prefix: [`[[lib] ${this.integrationName}`] });
  }

  private createContacts = async (attendees: Person[]) => {
    const contacts = attendees.map((attendee) => {
      const [firstname, lastname] = !!attendee.name ? attendee.name.split(" ") : [attendee.email, "-"];
      return {
        First_Name: firstname,
        Last_Name: lastname || "-",
        Email: attendee.email,
      };
    });
    return axios({
      method: "post",
      url: `https://www.zohoapis.com/crm/v3/Contacts`,
      headers: {
        "content-type": "application/json",
        authorization: `Zoho-oauthtoken ${this.accessToken}`,
      },
      data: JSON.stringify({ data: contacts }),
    });
  };

  private contactSearch = async (event: CalendarEvent) => {
    const searchCriteria = `(${event.attendees
      .map((attendee) => `(Email:equals:${encodeURI(attendee.email)})`)
      .join("or")})`;

    return await axios({
      method: "get",
      url: `https://www.zohoapis.com/crm/v3/Contacts/search?criteria=${searchCriteria}`,
      headers: {
        authorization: `Zoho-oauthtoken ${this.accessToken}`,
      },
    })
      .then((data) => data.data)
      .catch((e) => this.log.error(e, e.response?.data));
  };

  private getMeetingBody = (event: CalendarEvent): string => {
    return `<b>${event.organizer.language.translate("invitee_timezone")}:</b> ${
      event.attendees[0].timeZone
    }<br><br><b>${event.organizer.language.translate("share_additional_notes")}</b><br>${
      event.additionalNotes || "-"
    }`;
  };

  private createZohoEvent = async (event: CalendarEvent, contacts: CalendarEvent["attendees"]) => {
    const zohoEvent = {
      Event_Title: event.title,
      Start_DateTime: toISO8601String(new Date(event.startTime)),
      End_DateTime: toISO8601String(new Date(event.endTime)),
      Description: this.getMeetingBody(event),
      Venue: getLocation(event),
      Who_Id: contacts[0], // Link the first attendee as the primary Who_Id
    };

    return axios({
      method: "post",
      url: `https://www.zohoapis.com/crm/v3/Events`,
      headers: {
        "content-type": "application/json",
        authorization: `Zoho-oauthtoken ${this.accessToken}`,
      },
      data: JSON.stringify({ data: [zohoEvent] }),
    })
      .then((data) => data.data)
      .catch((e) => this.log.error(e, e.response?.data));
  };

  private updateMeeting = async (uid: string, event: CalendarEvent) => {
    const zohoEvent = {
      id: uid,
      Event_Title: event.title,
      Start_DateTime: toISO8601String(new Date(event.startTime)),
      End_DateTime: toISO8601String(new Date(event.endTime)),
      Description: this.getMeetingBody(event),
      Venue: getLocation(event),
    };
    return axios({
      method: "put",
      url: `https://www.zohoapis.com/crm/v3/Events`,
      headers: {
        "content-type": "application/json",
        authorization: `Zoho-oauthtoken ${this.accessToken}`,
      },
      data: JSON.stringify({ data: [zohoEvent] }),
    })
      .then((data) => data.data)
      .catch((e) => this.log.error(e, e.response?.data));
  };

  private deleteMeeting = async (uid: string) => {
    return axios({
      method: "delete",
      url: `https://www.zohoapis.com/crm/v3/Events?ids=${uid}`,
      headers: {
        "content-type": "application/json",
        authorization: `Zoho-oauthtoken ${this.accessToken}`,
      },
    })
      .then((data) => data.data)
      .catch((e) => this.log.error(e, e.response?.data));
  };

  private zohoCrmAuth = async (credential: CredentialPayload) => {
    const appKeys = await getAppKeysFromSlug("zohocrm");
    if (typeof appKeys.client_id === "string") this.client_id = appKeys.client_id;
    if (typeof appKeys.client_secret === "string") this.client_secret = appKeys.client_secret;
    if (!this.client_id) throw new HttpError({ statusCode: 400, message: "Zoho CRM client_id missing." });
    if (!this.client_secret)
      throw new HttpError({ statusCode: 400, message: "Zoho CRM client_secret missing." });
    const credentialKey = credential.key as unknown as ZohoToken;
    const isTokenValid = (token: ZohoToken) => {
      const isValid = token && token.access_token && token.expiryDate && token.expiryDate < Date.now();
      if (isValid) {
        this.accessToken = token.access_token;
      }
      return isValid;
    };

    const refreshAccessToken = async (credentialKey: ZohoToken) => {
      try {
        const url = `${credentialKey.accountServer}/oauth/v2/token`;
        const formData = {
          grant_type: "refresh_token",
          client_id: this.client_id,
          client_secret: this.client_secret,
          refresh_token: credentialKey.refresh_token,
        };
        const zohoCrmTokenInfo = await refreshOAuthTokens(
          async () =>
            await axios({
              method: "post",
              url: url,
              data: qs.stringify(formData),
              headers: {
                "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
              },
            }),
          "zohocrm",
          credential.userId
        );
        if (!zohoCrmTokenInfo.data.error) {
          // set expiry date as offset from current time.
          zohoCrmTokenInfo.data.expiryDate = Math.round(Date.now() + 60 * 60);

          await prisma.credential.update({
            where: {
              id: credential.id,
            },
            data: {
              key: {
                ...(zohoCrmTokenInfo.data as ZohoToken),
                refresh_token: credentialKey.refresh_token,
                accountServer: credentialKey.accountServer,
              },
            },
          });
          this.accessToken = zohoCrmTokenInfo.data.access_token;
          this.log.debug("Fetched token", this.accessToken);
        } else {
          this.log.error(zohoCrmTokenInfo.data);
        }
      } catch (e: unknown) {
        this.log.error(e);
      }
    };

    return {
      getToken: () => (isTokenValid(credentialKey) ? Promise.resolve() : refreshAccessToken(credentialKey)),
    };
  };

  async handleEventCreation(event: CalendarEvent, contacts: CalendarEvent["attendees"]) {
    const meetingEvent = await this.createZohoEvent(event, contacts);
    if (meetingEvent.data && meetingEvent.data.length && meetingEvent.data[0].status === "success") {
      this.log.debug("event:creation:ok", { meetingEvent });
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
    return Promise.reject("Something went wrong when creating a meeting in ZohoCRM");
  }

  async createEvent(event: CalendarEvent): Promise<NewCalendarEventType> {
    const auth = await this.auth;
    await auth.getToken();
    const contacts = await this.contactSearch(event);
    if (contacts.data && contacts.data.length) {
      if (contacts.data.length === event.attendees.length) {
        // all contacts are in Zoho CRM already.
        this.log.debug("contact:search:all", { event, contacts: contacts.data });
        return await this.handleEventCreation(event, contacts.data);
      } else {
        // Some attendees don't exist in ZohoCRM
        // Get the existing contacts' email to filter out
        this.log.debug("contact:search:notAll", { event, contacts });
        const existingContacts = contacts.data.map((contact: ZohoContact) => contact.Email);
        this.log.debug("contact:filter:existing", { existingContacts });
        // Get non existing contacts filtering out existing from attendees
        const nonExistingContacts: Person[] = event.attendees.filter(
          (attendee) => !existingContacts.includes(attendee.email)
        );
        this.log.debug("contact:filter:nonExisting", { nonExistingContacts });
        // Only create contacts in ZohoCRM that were not present in the previous contact search
        const createContacts = await this.createContacts(nonExistingContacts);
        this.log.debug("contact:created", { createContacts });
        // Continue with event creation and association only when all contacts are present in Zoho
        if (createContacts.data?.data[0].status === "success") {
          this.log.debug("contact:creation:ok");
          return await this.handleEventCreation(
            event,
            [createContacts.data?.data[0]?.details].concat(contacts.data)
          );
        }
        return Promise.reject({
          calError: "Something went wrong when creating non-existing attendees in ZohoCRM",
        });
      }
    } else {
      this.log.debug("contact:search:none", { event, contacts });
      const createContacts = await this.createContacts(event.attendees);
      this.log.debug("contact:created", { createContacts });
      if (createContacts.data?.data[0].status === "success") {
        this.log.debug("contact:creation:ok");
        return await this.handleEventCreation(event, [createContacts.data.data[0].details]);
      }
    }

    return Promise.reject({
      calError: "Something went wrong when searching/creating the attendees in ZohoCRM",
    });
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
