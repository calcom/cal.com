import { Credential } from "@prisma/client";

import { getLocation, getRichDescription } from "@calcom/lib/CalEventParser";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { BufferedBusyTime } from "@calcom/types/BufferedBusyTime";
import type {
  Calendar,
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";

import { isExpired, LARK_HOST, handleLarkError } from "../common";
import type {
  LarkAuthCredentials,
  LarkEvent,
  LarkEventAttendee,
  CreateEventResp,
  RefreshTokenResp,
  CreateAttendeesResp,
  FreeBusyResp,
  ListCalendarsResp,
  GetPrimaryCalendarsResp,
} from "../types/LarkCalendar";
import { getAppAccessToken } from "./AppAccessToken";

function parseEventTime2Timestamp(eventTime: string): string {
  return String(+new Date(eventTime) / 1000);
}

export default class LarkCalendarService implements Calendar {
  private url = "";
  private integrationName = "";
  private log: typeof logger;
  auth: { getToken: () => Promise<string> };

  constructor(credential: Credential) {
    this.integrationName = "lark_calendar";
    this.auth = this.larkAuth(credential);
    this.log = logger.getChildLogger({ prefix: [`[[lib] ${this.integrationName}`] });
  }

  private larkAuth = (credential: Credential) => {
    const larkAuthCredentials = credential.key as LarkAuthCredentials;
    return {
      getToken: () =>
        !isExpired(larkAuthCredentials.expiry_date)
          ? Promise.resolve(larkAuthCredentials.access_token)
          : this.refreshAccessToken(credential),
    };
  };

  private refreshAccessToken = async (credential: Credential) => {
    const larkAuthCredentials = credential.key as LarkAuthCredentials;
    const refreshExpireDate = larkAuthCredentials.refresh_expires_date;
    const refreshToken = larkAuthCredentials.refresh_token;
    if (isExpired(refreshExpireDate) || !refreshToken) {
      const res = await fetch("/api/integrations", {
        method: "DELETE",
        body: JSON.stringify({ id: credential.id }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        throw new Error("disconnection wrong");
      }
      throw new Error("refresh token expires");
    }
    try {
      const appAccessToken = await getAppAccessToken();

      const resp = await fetch(`https://${LARK_HOST}/open-apis/authen/v1/refresh_access_token`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${appAccessToken}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      });

      const data = await handleLarkError<RefreshTokenResp>(resp, this.log);
      const newLarkAuthCredentials: LarkAuthCredentials = {
        ...larkAuthCredentials,
        access_token: data.data.access_token,
        expiry_date: Math.round(+new Date() / 1000 + data.data.expires_in),
      };

      await prisma.credential.update({
        where: {
          id: credential.id,
        },
        data: {
          key: newLarkAuthCredentials,
        },
      });

      return newLarkAuthCredentials.access_token;
    } catch (error) {
      this.log.error("LarkCalendarService refreshAccessToken error", error);
      throw error;
    }
  };

  async createEvent(event: CalendarEvent): Promise<NewCalendarEventType> {
    let eventId = "";
    let eventRespData;
    const calendarId = event.destinationCalendar?.externalId;
    if (!calendarId) {
      throw new Error("no calendar id");
    }
    try {
      const accessToken = await this.auth.getToken();
      const eventResponse = await fetch(
        `https://${LARK_HOST}/open-apis/calendar/v4/calendars/${calendarId}/events/create_event`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(this.translateEvent(event)),
        }
      );
      eventRespData = await handleLarkError<CreateEventResp>(eventResponse, this.log);
      eventId = eventRespData.data.event.event_id as string;
    } catch (error) {
      this.log.error(error);
      throw error;
    }

    try {
      await this.createAttendees(event, eventId);
      return {
        ...eventRespData,
        uid: eventRespData.data.event.event_id as string,
        id: eventRespData.data.event.event_id as string,
        type: "lark_calendar",
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

  private createAttendees = async (event: CalendarEvent, eventId: string) => {
    const calendarId = event.destinationCalendar?.externalId;
    if (!calendarId) {
      this.log.error("no calendar id provided in createAttendees");
      throw new Error("no calendar id provided in createAttendees");
    }
    const accessToken = await this.auth.getToken();
    const attendeeResponse = await fetch(
      `https://${LARK_HOST}/open-apis/calendar/v4/calendars/${calendarId}/events/${eventId}/attendees/create_attendees`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attendees: this.translateAttendees(event),
          need_notification: false,
        }),
      }
    );

    return handleLarkError<CreateAttendeesResp>(attendeeResponse, this.log);
  };

  /**
   * @param uid
   * @param event
   * @returns
   */
  async updateEvent(uid: string, event: CalendarEvent, externalCalendarId?: string): Promise<any> {
    const eventId = uid;
    let eventRespData;
    const calendarId = externalCalendarId || event.destinationCalendar?.externalId;
    if (!calendarId) {
      this.log.error("no calendar id provided in updateEvent");
      throw new Error("no calendar id provided in updateEvent");
    }
    try {
      const accessToken = await this.auth.getToken();
      const eventResponse = await fetch(
        `https://${LARK_HOST}/open-apis/calendar/v4/calendars/${calendarId}/events/${eventId}/patch_event`,
        {
          method: "PATCH",
          headers: {
            Authorization: "Bearer " + accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(this.translateEvent(event)),
        }
      );
      eventRespData = await handleLarkError<CreateEventResp>(eventResponse, this.log);
    } catch (error) {
      this.log.error(error);
      throw error;
    }

    try {
      // Since attendees cannot be changed any more, updateAttendees is not needed
      // await this.updateAttendees(event, eventId);
      return {
        ...eventRespData,
        uid: eventRespData.data.event.event_id as string,
        id: eventRespData.data.event.event_id as string,
        type: "lark_calendar",
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
  async deleteEvent(uid: string, event: CalendarEvent, externalCalendarId?: string): Promise<void> {
    const calendarId = externalCalendarId || event.destinationCalendar?.externalId;
    if (!calendarId) {
      this.log.error("no calendar id provided in deleteEvent");
      throw new Error("no calendar id provided in deleteEvent");
    }
    try {
      const accessToken = await this.auth.getToken();
      const response = await fetch(
        `https://${LARK_HOST}/open-apis/calendar/v4/calendars/${calendarId}/events/${uid}`,
        {
          method: "DELETE",
          headers: {
            Authorization: "Bearer " + accessToken,
          },
        }
      );
      await handleLarkError(response, this.log);
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
      .map((e) => e.externalId)
      .filter(Boolean);
    if (selectedCalendarIds.length === 0 && selectedCalendars.length > 0) {
      // Only calendars of other integrations selected
      return Promise.resolve([]);
    }

    try {
      let queryIds = selectedCalendarIds;
      if (queryIds.length === 0) {
        queryIds = (await this.listCalendars()).map((e) => e.externalId).filter(Boolean) || [];
        if (queryIds.length === 0) {
          return Promise.resolve([]);
        }
      }

      const accessToken = await this.auth.getToken();

      const response = await fetch(`https://${LARK_HOST}/open-apis/calendar/v4/freebusy/batch_get`, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json",
          "x-tt-env": "boe_wangzichao",
        },
        body: JSON.stringify({
          time_min: dateFrom,
          time_max: dateTo,
          calendar_ids: queryIds,
        }),
      });

      const data = await handleLarkError<FreeBusyResp>(response, this.log);

      const busyData =
        data.data.freebusy_list?.reduce<BufferedBusyTime[]>((acc, cur) => {
          acc.push({
            start: cur.start_time,
            end: cur.end_time,
          });
          return acc;
        }, []) || [];
      return busyData;
    } catch (error) {
      this.log.error(error);
      return [];
    }
  }

  listCalendars = async (): Promise<IntegrationCalendar[]> => {
    try {
      const accessToken = await this.auth.getToken();
      const resp = await fetch(`https://${LARK_HOST}/open-apis/calendar/v4/calendars`, {
        method: "get",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json",
        },
      });

      const data = await handleLarkError<ListCalendarsResp>(resp, this.log);
      const result = data.data.calendar_list
        .filter((cal) => {
          if (cal.type !== "primary" && cal.type !== "shared") {
            return false;
          }
          if (cal.permissions === "private") {
            return false;
          }
          if (cal.role === "owner" || cal.role === "writer") {
            return true;
          }
          return false;
        })
        .map((cal) => {
          const calendar: IntegrationCalendar = {
            externalId: cal.calendar_id ?? "No Id",
            integration: this.integrationName,
            name: cal.summary_alias || cal.summary || "No calendar name",
            primary: cal.type === "primary",
          };
          return calendar;
        });

      if (result.some((cal) => !!cal.primary)) {
        return result;
      }

      // No primary calendar found, get primary calendar directly
      const respPrimary = await fetch(`https://${LARK_HOST}/open-apis/calendar/v4/calendars/primary`, {
        method: "post",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json",
        },
      });
      const dataPrimary = await handleLarkError<GetPrimaryCalendarsResp>(respPrimary, this.log);
      return dataPrimary.data.calendars.map((item) => {
        const cal = item.calendar;
        const calendar: IntegrationCalendar = {
          externalId: cal.calendar_id ?? "No Id",
          integration: this.integrationName,
          name: cal.summary_alias || cal.summary || "No calendar name",
          primary: cal.type === "primary",
        };
        return calendar;
      });
    } catch (err) {
      this.log.error("There was an error contacting lark calendar service: ", err);
      throw err;
    }
  };

  private translateEvent = (event: CalendarEvent): LarkEvent => {
    const larkEvent: LarkEvent = {
      summary: event.title,
      description: getRichDescription(event),
      start_time: {
        timestamp: parseEventTime2Timestamp(event.startTime),
        timezone: event.organizer.timeZone,
      },
      end_time: {
        timestamp: parseEventTime2Timestamp(event.endTime),
        timezone: event.organizer.timeZone,
      },
      attendee_ability: "none",
      free_busy_status: "busy",
      reminders: [
        {
          minutes: 5,
        },
      ],
    };
    if (event.location) {
      larkEvent.location = { name: getLocation(event) };
    }
    return larkEvent;
  };

  private translateAttendees = (event: CalendarEvent): LarkEventAttendee[] => {
    const attendees: LarkEventAttendee[] = event.attendees
      .filter((att) => att.email)
      .map((att) => {
        const attendee: LarkEventAttendee = {
          type: "third_party",
          is_optional: false,
          third_party_email: att.email,
        };
        return attendee;
      });
    return attendees;
  };
}
