import { stringify } from "querystring";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { getLocation, getRichDescription } from "@calcom/lib/CalEventParser";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type {
  Calendar,
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

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
    this.log = logger.getSubLogger({
      prefix: [`[[lib] ${this.integrationName}`],
    });
  }

  private zohoAuth = (credential: CredentialPayload) => {
    let zohoCredentials = credential.key as ZohoAuthCredentials;

    const refreshAccessToken = async () => {
      try {
        const appKeys = await getAppKeysFromSlug("zohocalendar");
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
      ...init,
      headers: {
        Authorization: `Bearer ${credentials.access_token}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  };

  private getUserInfo = async () => {
    const credentials = await this.auth.getToken();

    const response = await fetch(`https://accounts.zoho.com/oauth/user/info`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${credentials.access_token}`,
        "Content-Type": "application/json",
      },
    });

    return this.handleData(response, this.log);
  };

  async createEvent(event: CalendarEvent): Promise<NewCalendarEventType> {
    let eventId = "";
    let eventRespData;
    const [mainHostDestinationCalendar] = event.destinationCalendar ?? [];
    const calendarId = mainHostDestinationCalendar?.externalId;
    if (!calendarId) {
      throw new Error("no calendar id");
    }

    try {
      const query = stringify({
        eventdata: JSON.stringify(this.translateEvent(event)),
      });

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
        id: eventRespData.events[0].uid as string,
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
    const [mainHostDestinationCalendar] = event.destinationCalendar ?? [];
    const calendarId = externalCalendarId || mainHostDestinationCalendar?.externalId;
    if (!calendarId) {
      this.log.error("no calendar id provided in updateEvent");
      throw new Error("no calendar id provided in updateEvent");
    }
    try {
      // needed to fetch etag
      const existingEventResponse = await this.fetcher(`/calendars/${calendarId}/events/${uid}`);
      const existingEventData = await this.handleData(existingEventResponse, this.log);

      const query = stringify({
        eventdata: JSON.stringify({
          ...this.translateEvent(event),
          etag: existingEventData.events[0].etag,
        }),
      });

      const eventResponse = await this.fetcher(`/calendars/${calendarId}/events/${uid}?${query}`, {
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
        id: eventRespData.events[0].uid as string,
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
    const [mainHostDestinationCalendar] = event.destinationCalendar ?? [];
    const calendarId = externalCalendarId || mainHostDestinationCalendar?.externalId;
    if (!calendarId) {
      this.log.error("no calendar id provided in deleteEvent");
      throw new Error("no calendar id provided in deleteEvent");
    }
    try {
      // needed to fetch etag
      const existingEventResponse = await this.fetcher(`/calendars/${calendarId}/events/${uid}`);
      const existingEventData = await this.handleData(existingEventResponse, this.log);

      const response = await this.fetcher(`/calendars/${calendarId}/events/${uid}`, {
        method: "DELETE",
        headers: {
          etag: existingEventData.events[0].etag,
        },
      });
      await this.handleData(response, this.log);
    } catch (error) {
      this.log.error(error);
      throw error;
    }
  }

  private async getBusyData(dateFrom: string, dateTo: string, userEmail: string) {
    const query = stringify({
      sdate: dateFrom,
      edate: dateTo,
      ftype: "eventbased",
      uemail: userEmail,
    });

    const response = await this.fetcher(`/calendars/freebusy?${query}`, {
      method: "GET",
    });

    const data = await this.handleData(response, this.log);

    if (data.fb_not_enabled || data.NODATA) return [];

    return (
      data.freebusy
        .filter((freebusy: FreeBusy) => freebusy.fbtype === "busy")
        .map((freebusy: FreeBusy) => ({
          // using dayjs utc plugin because by default, dayjs parses and displays in local time, which causes a mismatch
          start: dayjs.utc(freebusy.startTime, "YYYYMMDD[T]HHmmss[Z]").toISOString(),
          end: dayjs.utc(freebusy.endTime, "YYYYMMDD[T]HHmmss[Z]").toISOString(),
        })) || []
    );
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

      if (!selectedCalendars[0]) return [];

      const userInfo = await this.getUserInfo();
      const originalStartDate = dayjs(dateFrom);
      const originalEndDate = dayjs(dateTo);
      const diff = originalEndDate.diff(originalStartDate, "days");

      if (diff <= 30) {
        const busyData = await this.getBusyData(
          originalStartDate.format("YYYYMMDD[T]HHmmss[Z]"),
          originalEndDate.format("YYYYMMDD[T]HHmmss[Z]"),
          userInfo.Email
        );
        return busyData;
      } else {
        // Zoho only supports 31 days of freebusy data
        const busyData = [];

        const loopsNumber = Math.ceil(diff / 30);

        let startDate = originalStartDate;
        let endDate = originalStartDate.add(30, "days");

        for (let i = 0; i < loopsNumber; i++) {
          if (endDate.isAfter(originalEndDate)) endDate = originalEndDate;

          busyData.push(
            ...(await this.getBusyData(
              startDate.format("YYYYMMDD[T]HHmmss[Z]"),
              endDate.format("YYYYMMDD[T]HHmmss[Z]"),
              userInfo.Email
            ))
          );

          startDate = endDate.add(1, "minutes");
          endDate = startDate.add(30, "days");
        }

        return busyData;
      }
    } catch (error) {
      this.log.error(error);
      return [];
    }
  }

  async listCalendars(): Promise<IntegrationCalendar[]> {
    try {
      const resp = await this.fetcher(`/calendars`);
      const data = (await this.handleData(resp, this.log)) as ZohoCalendarListResp;
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
      const dataPrimary = (await this.handleData(respPrimary, this.log)) as ZohoCalendarListResp;
      return dataPrimary.calendars.map((cal) => {
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
  }

  async handleData(response: Response, log: typeof logger) {
    const data = await response.json();
    if (!response.ok) {
      log.debug("zoho request with data", data);
      throw data;
    }
    log.debug("zoho request with data", data);
    return data;
  }

  private translateEvent = (event: CalendarEvent) => {
    const zohoEvent = {
      title: event.title,
      description: getRichDescription(event),
      dateandtime: {
        start: dayjs(event.startTime).format("YYYYMMDDTHHmmssZZ"),
        end: dayjs(event.endTime).format("YYYYMMDDTHHmmssZZ"),
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
