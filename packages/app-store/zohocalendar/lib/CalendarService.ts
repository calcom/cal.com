import { stringify } from "querystring";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { getLocation, getRichDescription } from "@calcom/lib/CalEventParser";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { Calendar, CalendarEvent, EventBusyDate, IntegrationCalendar, NewCalendarEventType } from "@calcom/types/Calendar";
import { CredentialPayload } from "@calcom/types/Credential";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import type { ZohoAuthCredentials, FreeBusy, ZohoCalendarListResp } from "../types/ZohoCalendar";

const zohoKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
});

export default class ZohoCalendarService implements Calendar {
  private integrationName = "";
  private log: typeof logger;
  auth: { getToken: () => Promise<ZohoAuthCredentials> };

  constructor(credential: CredentialPayload) {
    this.integrationName = "zoho_calendar";
    this.auth = this.zohoAuth(credential);
    this.log = logger.getChildLogger({ prefix: [`[[lib] ${this.integrationName}`] });
  }

  private zohoAuth = (credential: CredentialPayload) => {
    let zohoCredentials = credential.key as ZohoAuthCredentials;

    const refreshAccessToken = async () => {
      try {
        const appKeys = await getAppKeysFromSlug("zoho-calendar");
        const { client_id, client_secret } = zohoKeysSchema.parse(appKeys);

        const params = {
          client_id,
          grant_type: "refresh_token",
          client_secret,
          refresh_token: zohoCredentials.refresh_token,
        };

        const query = stringify(params);

        const res = await fetch(`https://accounts.zoho.com/oauth/v2/token?${query}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
        });

        const token = await res.json();

        const key: ZohoAuthCredentials = {
          access_token: token.access_token,
          refresh_token: zohoCredentials.refresh_token,
          expires_in: Math.round(+new Date() / 1000 + token.expires_in),
        };
        await prisma.credential.update({
          where: { id: credential.id },
          data: { key },
        });
        zohoCredentials = key;
      } catch (err) {
        this.log.error("Error refreshing zoho token", err);
      }
      return zohoCredentials;
    };

    return {
      getToken: async () => {
        const isExpired = () => new Date(zohoCredentials.expires_in * 1000).getTime() <= new Date().getTime();
        return !isExpired() ? Promise.resolve(zohoCredentials) : refreshAccessToken();
      },
    };
  };

  private fetcher = async (endpoint: string, init?: RequestInit | undefined) => {
    const credentials = await this.auth.getToken();

    return fetch(`https://calendar.zoho.com/api/v1${endpoint}`, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + credentials.access_token,
        "Content-Type": "application/json",
        ...init?.headers,
      },
      ...init,
    });
  };

  async createEvent(event: CalendarEvent): Promise<NewCalendarEventType> {
    let eventId = "";
    let eventRespData;
    const calendarId = event.destinationCalendar?.externalId;
    if (!calendarId) {
      throw new Error("no calendar id");
    }

    try {
      const query = stringify({ eventdata: JSON.stringify(this.translateEvent(event)) });

      const eventResponse = await this.fetcher(`/calendars/${calendarId}/events?${query}`, {
        method: "POST",
      });
      eventRespData = await this.handleData(eventResponse, this.log);
      eventId = eventRespData.events[0].uid as string;
    } catch (error) {
      this.log.error(error);
      throw error;
    }

    try {
      return {
        ...eventRespData.events[0],
        uid: eventRespData.events[0].uid as string,
        id: eventRespData.events[0].id as string,
        type: "zoho_calendar",
        password: "",
        url: "",
        additionalInfo: {},
      };
    } catch (error) {
      this.log.error(error);
      await this.deleteEvent(eventId, event, calendarId);
      throw error;
    }
  }

  /**
   * @param uid
   * @param event
   * @returns
   */
  async updateEvent(uid: string, event: CalendarEvent, externalCalendarId?: string) {
    const eventId = uid;
    let eventRespData;
    const calendarId = externalCalendarId || event.destinationCalendar?.externalId;
    if (!calendarId) {
      this.log.error("no calendar id provided in updateEvent");
      throw new Error("no calendar id provided in updateEvent");
    }
    try {
      const query = stringify({ eventdata: JSON.stringify(this.translateEvent(event)) });

      const eventResponse = await this.fetcher(`/calendars/${calendarId}/events/${eventId}?${query}`, {
        method: "PUT",
      });
      eventRespData = await this.handleData(eventResponse, this.log);
    } catch (error) {
      this.log.error(error);
      throw error;
    }

    try {
      return {
        ...eventRespData.events[0],
        uid: eventRespData.events[0].uid as string,
        id: eventRespData.events[0].id as string,
        type: "zoho_calendar",
        password: "",
        url: "",
        additionalInfo: {},
      };
    } catch (error) {
      this.log.error(error);
      await this.deleteEvent(eventId, event);
      throw error;
    }
  }

  /**
   * @param uid
   * @param event
   * @returns
   */
  async deleteEvent(uid: string, event: CalendarEvent, externalCalendarId?: string) {
    const calendarId = externalCalendarId || event.destinationCalendar?.externalId;
    if (!calendarId) {
      this.log.error("no calendar id provided in deleteEvent");
      throw new Error("no calendar id provided in deleteEvent");
    }
    try {
      const response = await this.fetcher(`/calendars/${calendarId}/events/${uid}`, {
        method: "DELETE",
      });
      await this.handleData(response, this.log);
    } catch (error) {
      this.log.error(error);
      throw error;
    }
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
  ): Promise<EventBusyDate[]> {
    const selectedCalendarIds = selectedCalendars
      .filter((e) => e.integration === this.integrationName)
      .map((e) => e.externalId);
    if (selectedCalendarIds.length === 0 && selectedCalendars.length > 0) {
      // Only calendars of other integrations selected
      return Promise.resolve([]);
    }

    try {
      let queryIds = selectedCalendarIds;

      if (queryIds.length === 0) {
        queryIds = (await this.listCalendars()).map((e) => e.externalId) || [];
        if (queryIds.length === 0) {
          return Promise.resolve([]);
        }
      }

      let email = selectedCalendarIds[0].email;

      const query = stringify({
        sdate: dayjs(dateFrom).format("YYYYMMDD[T]HHmmss[Z]"),
        edate: dayjs(dateTo).format("YYYYMMDD[T]HHmmss[Z]"),
        ftype: "eventbased",
        uemail: email,
      });

      const response = await this.fetcher(`/calendars/freebusy?${query}`, {
        method: "GET",
      });

      const data = await this.handleData(response, this.log);

      if (data.fb_not_enabled) return [];

      const busyData =
        data.freebusy
          .filter((freebusy: FreeBusy) => freebusy.fbtype === "busy")
          .map((freebusy: FreeBusy) => ({
            start: dayjs(freebusy.startTime, "YYYYMMDD[T]HHmmss[Z]").toISOString(),
            end: dayjs(freebusy.endTime, "YYYYMMDD[T]HHmmss[Z]").toISOString(),
          })) || [];
      return busyData;
    } catch (error) {
      this.log.error(error);
      return [];
    }
  }

  listCalendars = async (): Promise<IntegrationCalendar[]> => {
    try {
      const resp = await this.fetcher(`/calendars`);
      const data = await this.handleData(resp, this.log) as ZohoCalendarListResp;
      const result = data.calendars
        .filter((cal) => {
          if (cal.privilege === "owner") {
            return true;
          }
          return false;
        })
        .map((cal) => {
          const calendar: IntegrationCalendar = {
            externalId: cal.uid ?? "No Id",
            integration: this.integrationName,
            name: cal.name || "No calendar name",
            primary: cal.isdefault,
            email: cal.uid ?? "",
          };
          return calendar;
        });

      if (result.some((cal) => !!cal.primary)) {
        return result;
      }

      // No primary calendar found, get primary calendar directly
      const respPrimary = await this.fetcher(`/calendars?category=own`);
      const dataPrimary = await this.handleData(respPrimary, this.log) as ZohoCalendarListResp;
      return dataPrimary.map((cal) => {
        const calendar: IntegrationCalendar = {
          externalId: cal.uid ?? "No Id",
          integration: this.integrationName,
          name: cal.name || "No calendar name",
          primary: cal.isdefault,
          email: cal.uid ?? "",
        };
        return calendar;
      });
    } catch (err) {
      this.log.error("There was an error contacting zoho calendar service: ", err);
      throw err;
    }
  };

  handleData = async (response: Response, log: typeof logger) => {
    const data = await response.json();
    if (!response.ok) {
      log.debug("zoho request with data", data);
      throw data;
    }
    log.debug("zoho request with data", data);
    return data;
  };

  private translateEvent = (event: CalendarEvent) => {
    const zohoEvent = {
      title: event.title,
      description: getRichDescription(event),
      dateandtime: {
        start: dayjs.tz(event.startTime, event.organizer.timeZone).format("YYYYMMDDTHHmmssZZ"),
        end: dayjs.tz(event.endTime, event.organizer.timeZone).format("YYYYMMDDTHHmmssZZ"),
        timezone: event.organizer.timeZone,
      },
      attendees: event.attendees.map((attendee) => ({ email: attendee.email })),
      isprivate: event.seatsShowAttendees,
      reminders: [
        {
          minutes: "-15",
          action: "popup",
        },
      ],
      location: event.location ? getLocation(event) : undefined,
    };

    return zohoEvent;
  };
}