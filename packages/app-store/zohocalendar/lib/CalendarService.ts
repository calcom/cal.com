import { stringify } from "querystring";

import dayjs from "@calcom/dayjs";
import { getLocation } from "@calcom/lib/CalEventParser";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type {
  Calendar,
  CalendarServiceEvent,
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
  RecurringEvent,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import type { ZohoAuthCredentials, FreeBusy, ZohoCalendarListResp } from "../types/ZohoCalendar";
import { appKeysSchema as zohoKeysSchema } from "../zod";

/**
 * Zoho Calendar API repeat format
 * Based on: https://www.zoho.com/calendar/help/api/post-create-event.html
 */
interface ZohoRepeatObject {
  freq: "daily" | "weekly" | "monthly" | "yearly";
  interval?: string; // string format: "1", "2", etc.
  count?: number | string;
  until?: string; // Format: YYYYMMDDTHHmmss (e.g., "20241121T040000")
  byday?: string; // Comma-separated: "MO,TU,WE" or positioned: "3FR" (3rd Friday), "-1MO" (last Monday)
  bymonthday?: number; // Day of month (1-31)
  bymonth?: number; // Month (1-12, used with yearly)
  bysetpos?: number; // Position in set (1-4 or -1 for last, used with byday in monthly/yearly)
}

/**
 * Zoho event instance from /byinstance API
 */
interface ZohoEventInstance {
  uid: string;
  recurrenceid: string; // Format: "20191101T090000Z"
  dateandtime: {
    timezone: string;
    start: string;
    end: string;
  };
  title: string;
  etag: string | number;
  // ... other fields
}

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
        const server_location = zohoCredentials.server_location;
        const params = {
          client_id,
          grant_type: "refresh_token",
          client_secret,
          refresh_token: zohoCredentials.refresh_token,
        };

        const query = stringify(params);

        const res = await fetch(`https://accounts.zoho.${server_location}/oauth/v2/token?${query}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
        });

        const token = await res.json();

        // Revert if access_token is not present
        if (!token.access_token) {
          throw new Error("Invalid token response");
        }

        const key: ZohoAuthCredentials = {
          access_token: token.access_token,
          refresh_token: zohoCredentials.refresh_token,
          expires_in: Math.round(+new Date() / 1000 + token.expires_in),
          server_location,
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
    return fetch(`https://calendar.zoho.${credentials.server_location}/api/v1${endpoint}`, {
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
    const response = await fetch(`https://accounts.zoho.${credentials.server_location}/oauth/user/info`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${credentials.access_token}`,
        "Content-Type": "application/json",
      },
    });

    return this.handleData(response, this.log);
  };

  async createEvent(event: CalendarServiceEvent): Promise<NewCalendarEventType> {
    let eventId = "";
    let eventRespData;
    const [mainHostDestinationCalendar] = event.destinationCalendar ?? [];
    const calendarId = mainHostDestinationCalendar?.externalId;
    if (!calendarId) {
      throw new Error("no calendar id");
    }

    try {
      this.log.debug("Creating event", {
        hasRecurringEvent: !!event.recurringEvent,
        hasExistingRecurringEvent: !!event.existingRecurringEvent,
      });

      // Note: Zoho doesn't support booking into existing recurring series via direct API
      // The existingRecurringEvent feature would require fetching instances and updating
      // which is not directly documented in Zoho's API
      if (event.existingRecurringEvent) {
        this.log.warn("Zoho Calendar API does not support booking into existing recurring series directly", {
          recurringEventId: event.existingRecurringEvent.recurringEventId,
        });
        // Fall through to create a normal single event
      }

      const translatedEvent = this.translateEvent(event);

      // Add recurrence if this is a recurring event
      // Use 'repeat' array format per Zoho docs
      if (event.recurringEvent) {
        this.log.info("Creating new recurring event series", {
          freq: event.recurringEvent.freq,
          interval: event.recurringEvent.interval,
          count: event.recurringEvent.count,
        });

        translatedEvent.repeat = this.mapRecurrenceToZohoFormat(event.recurringEvent);
      }

      const query = stringify({
        eventdata: JSON.stringify(translatedEvent),
      });

      const eventResponse = await this.fetcher(`/calendars/${calendarId}/events?${query}`, {
        method: "POST",
      });
      eventRespData = await this.handleData(eventResponse, this.log);
      eventId = eventRespData.events[0].uid as string;

      this.log.info("Event created successfully", {
        eventId,
        isRecurring: !!event.recurringEvent,
      });
    } catch (error) {
      this.log.error("Error creating event", { error, event });
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
        // For recurring events, store the event ID as the recurring event ID
        ...(event.recurringEvent && { thirdPartyRecurringEventId: eventId }),
      };
    } catch (error) {
      this.log.error("Error processing event response", { error });
      await this.deleteEvent(eventId, event, calendarId);
      throw error;
    }
  }

  /**
   * @param uid
   * @param event
   * @returns
   */
  async updateEvent(
    uid: string,
    event: CalendarServiceEvent,
    externalCalendarId?: string,
    isRecurringInstanceReschedule?: boolean
  ) {
    const eventId = uid;
    let eventRespData;
    const [mainHostDestinationCalendar] = event.destinationCalendar ?? [];
    const calendarId = externalCalendarId || mainHostDestinationCalendar?.externalId;
    if (!calendarId) {
      this.log.error("no calendar id provided in updateEvent");
      throw new Error("no calendar id provided in updateEvent");
    }

    try {
      this.log.debug("Updating event", {
        uid,
        isRecurringInstanceReschedule,
        hasRescheduleInstance: !!event.rescheduleInstance,
      });

      // Handle recurring instance reschedule
      if (isRecurringInstanceReschedule && event.rescheduleInstance) {
        this.log.info("Detected recurring instance reschedule request", {
          uid,
          formerTime: event.rescheduleInstance.formerTime,
          newTime: event.rescheduleInstance.newTime,
        });

        return await this.updateSpecificRecurringInstance(uid, event, calendarId);
      }

      // Normal event update logic
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

      this.log.debug("Event updated successfully", { uid });
    } catch (error) {
      this.log.error("Error updating event", { error, uid });
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
      this.log.error("Error processing update response", { error });
      await this.deleteEvent(eventId, event);
      throw error;
    }
  }

  /**
   * @param uid
   * @param event
   * @returns
   */
  async deleteEvent(
    uid: string,
    event?: CalendarEvent,
    externalCalendarId?: string,
    isRecurringInstanceCancellation?: boolean
  ) {
    const [mainHostDestinationCalendar] = event?.destinationCalendar ?? [];
    const calendarId = externalCalendarId || mainHostDestinationCalendar?.externalId;
    if (!calendarId) {
      this.log.error("no calendar id provided in deleteEvent");
      throw new Error("no calendar id provided in deleteEvent");
    }

    try {
      this.log.info("deleteEvent called", {
        uid,
        isRecurringInstanceCancellation,
        cancelledDatesCount: event?.cancelledDates?.length || 0,
      });

      // Handle instance-level cancellation
      if (isRecurringInstanceCancellation && event?.cancelledDates && event.cancelledDates.length > 0) {
        this.log.info("Processing instance cancellation", {
          uid,
          cancelledDatesCount: event.cancelledDates.length,
        });

        await this.cancelSpecificInstances(uid, event.cancelledDates, calendarId);
        return;
      }

      // Handle full event deletion (default behavior)
      this.log.info("Deleting entire event", { uid });

      // Fetch event to get etag and check if it's recurring
      const existingEventResponse = await this.fetcher(`/calendars/${calendarId}/events/${uid}`);
      const existingEventData = await this.handleData(existingEventResponse, this.log);

      if (!existingEventData.events || existingEventData.events.length === 0) {
        throw new Error("Event not found");
      }

      // Find the master event (for recurring) or the single event (for non-recurring)
      const masterEvent = existingEventData.events.find((e) => e.rrule && !e.recurrenceid && !e.estatus);

      const targetEvent = masterEvent || existingEventData.events[0];

      if (!targetEvent) {
        throw new Error("Could not find event to delete");
      }

      const isRecurring = !!targetEvent.rrule;

      this.log.debug("Preparing to delete event", {
        uid,
        isRecurring,
        etag: targetEvent.etag,
        hasRrule: !!targetEvent.rrule,
      });

      // For deleting entire event (recurring or non-recurring),
      // we just need to delete with the master event's etag
      // No need for recurrence_edittype when deleting the master
      this.log.info(isRecurring ? "Deleting entire recurring series" : "Deleting single event", {
        uid,
        etag: targetEvent.etag,
      });

      const response = await this.fetcher(`/calendars/${calendarId}/events/${uid}`, {
        method: "DELETE",
        headers: {
          etag: String(targetEvent.etag),
        },
      });

      await this.handleData(response, this.log);

      this.log.info("Event deleted successfully", {
        uid,
        isRecurring,
        deletedType: isRecurring ? "recurring series" : "single event",
      });
    } catch (error) {
      this.log.error("Error deleting event", { error, uid });
      throw error;
    }
  }

  private parseDateTime = (dateTimeStr: string) => {
    const dateOnlyFormat = "YYYYMMDD";
    const dateTimeFormat = "YYYYMMDD[T]HHmmss[Z]";
    // Check if the string matches the date-only format (YYYYMMDDZ) or date-time format
    const format = /^\d{8}Z$/.test(dateTimeStr) ? dateOnlyFormat : dateTimeFormat;
    return dayjs.utc(dateTimeStr, format);
  };

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
          start: this.parseDateTime(freebusy.startTime).toISOString(),
          end: this.parseDateTime(freebusy.endTime).toISOString(),
        })) || []
    );
  }

  private async getUnavailability(
    range: { start: string; end: string },
    calendarId: string
  ): Promise<Array<{ start: string; end: string }>> {
    const query = stringify({
      range: JSON.stringify(range),
    });
    this.log.debug("getUnavailability query", query);
    try {
      // List all events within the range
      const response = await this.fetcher(`/calendars/${calendarId}/events?${query}`);
      const data = await this.handleData(response, this.log);

      // Check for no data scenario
      if (!data.events || data.events.length === 0) return [];

      return (
        data.events
          .filter((event: any) => event.isprivate === false)
          .map((event: any) => {
            const start = dayjs(event.dateandtime.start, "YYYYMMDD[T]HHmmssZ").utc().toISOString();
            const end = dayjs(event.dateandtime.end, "YYYYMMDD[T]HHmmssZ").utc().toISOString();
            return { start, end };
          }) || []
      );
    } catch (error) {
      this.log.error(error);
      return [];
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

        const unavailabilityData = await Promise.all(
          queryIds.map((calendarId) =>
            this.getUnavailability(
              {
                start: originalStartDate.format("YYYYMMDD[T]HHmmss[Z]"),
                end: originalEndDate.format("YYYYMMDD[T]HHmmss[Z]"),
              },
              calendarId
            )
          )
        );

        const unavailability = unavailabilityData.flat();

        return busyData.concat(unavailability);
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

          const unavailabilityData = await Promise.all(
            queryIds.map((calendarId) =>
              this.getUnavailability(
                {
                  start: startDate.format("YYYYMMDD[T]HHmmss[Z]"),
                  end: endDate.format("YYYYMMDD[T]HHmmss[Z]"),
                },
                calendarId
              )
            )
          );

          const unavailability = unavailabilityData.flat();

          busyData.push(...unavailability);

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
      const userInfo = await this.getUserInfo();
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
            email: userInfo.Email ?? "",
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
          email: userInfo.Email ?? "",
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

  private translateEvent = (event: CalendarServiceEvent) => {
    const zohoEvent: any = {
      title: event.title,
      description: event.calendarDescription,
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

  /**
   * Maps RecurringEvent to Zoho's 'repeat' array format
   * Based on official docs: https://www.zoho.com/calendar/help/api/post-create-event.html
   *
   * Examples from Zoho docs:
   * - Daily: [{"freq": "daily", "interval": "1", "count": 5}]
   * - Weekly: [{"freq": "weekly", "interval": "1", "byday": "MO,TU", "until": "20241121T040000"}]
   * - Monthly: [{"freq": "monthly", "byday": "-1TU", "interval": "1", "count": 2}] (Last Tuesday)
   * - Yearly: [{"freq": "yearly", "byday": "3FR", "bymonth": 11}] (3rd Friday of November)
   */
  private mapRecurrenceToZohoFormat(recurringEvent: RecurringEvent): ZohoRepeatObject[] {
    this.log.debug("Mapping recurring event to Zoho format", { recurringEvent });

    try {
      // Map frequency - RRule.Frequency enum: 0=YEARLY, 1=MONTHLY, 2=WEEKLY, 3=DAILY
      const freqMap: Record<number, "daily" | "weekly" | "monthly" | "yearly"> = {
        0: "yearly",
        1: "monthly",
        2: "weekly",
        3: "daily",
      };

      const repeatObj: ZohoRepeatObject = {
        freq: freqMap[recurringEvent.freq] || "daily",
        interval: recurringEvent.interval ? String(recurringEvent.interval) : "1",
      };

      // Handle COUNT
      if (recurringEvent.count) {
        repeatObj.count = recurringEvent.count;
      }

      // Handle UNTIL - Zoho format: YYYYMMDDTHHmmss (no Z)
      if (recurringEvent.until) {
        repeatObj.until = dayjs(recurringEvent.until).format("YYYYMMDDTHHmmss");
      }

      // Handle BYDAY (days of week)
      if (recurringEvent.byDay && recurringEvent.byDay.length > 0) {
        // Check if we need positioned days (e.g., "3FR" for 3rd Friday)
        if (recurringEvent.bySetPos && recurringEvent.bySetPos.length > 0) {
          // Format: <position><day> e.g., "3FR", "-1MO" (last Monday)
          const position = recurringEvent.bySetPos[0];
          const day = recurringEvent.byDay[0]; // Use first day if multiple
          repeatObj.byday = `${position}${day}`;
          repeatObj.bysetpos = position;
        } else {
          // Simple days: "MO,TU,WE"
          repeatObj.byday = recurringEvent.byDay.join(",");
        }
      }

      // Handle BYMONTHDAY (day of month)
      if (recurringEvent.byMonthDay && recurringEvent.byMonthDay.length > 0) {
        repeatObj.bymonthday = recurringEvent.byMonthDay[0];
      }

      // Handle BYMONTH (for yearly events)
      if (recurringEvent.byMonth && recurringEvent.byMonth.length > 0) {
        repeatObj.bymonth = recurringEvent.byMonth[0];
      }

      const repeatArray = [repeatObj];

      this.log.debug("Generated Zoho repeat array", { repeatArray });
      return repeatArray;
    } catch (error) {
      this.log.error("Error building Zoho repeat from recurring event", { error, recurringEvent });
      throw error;
    }
  }

  /**
   * Gets all instances of a recurring event using /byinstance API
   * https://www.zoho.com/calendar/help/api/get-event-by-instance.html
   */
  private async getRecurringEventInstances(
    calendarId: string,
    eventUid: string,
    startDate: string,
    endDate: string
  ): Promise<ZohoEventInstance[]> {
    try {
      // Format dates for Zoho API: yyyyMMddTHHmmssZ or yyyyMMdd
      const range = {
        start: `${dayjs(startDate).utc().format("YYYYMMDDTHHmmss")}Z`,
        end: `${dayjs(endDate).utc().format("YYYYMMDDTHHmmss")}Z`,
      };

      const query = stringify({ range: JSON.stringify(range) });

      this.log.debug("Fetching recurring event instances", {
        eventUid,
        range,
      });

      const response = await this.fetcher(`/calendars/${calendarId}/events/${eventUid}/byinstance?${query}`);
      const data = await this.handleData(response, this.log);

      if (!data.events || data.events.length === 0) {
        this.log.warn("No instances found for recurring event", { eventUid });
        return [];
      }

      return data.events as ZohoEventInstance[];
    } catch (error) {
      this.log.error("Error fetching recurring event instances", {
        error,
        eventUid,
        calendarId,
      });
      throw error;
    }
  }

  /**
   * Updates a specific recurring instance using Zoho's /byinstance API and recurrenceid
   * Based on:
   * - https://www.zoho.com/calendar/help/api/put-update-event.html
   * - https://www.zoho.com/calendar/help/api/get-event-by-instance.html
   *
   * Process:
   * 1. Use /byinstance API to get all instances
   * 2. Find the instance matching formerTime
   * 3. Update that instance with recurrenceid and recurrence_edittype="only"
   */
  private async updateSpecificRecurringInstance(
    uid: string,
    event: CalendarServiceEvent,
    calendarId: string
  ): Promise<NewCalendarEventType> {
    try {
      this.log.info("Updating specific recurring instance", {
        uid,
        formerTime: event.rescheduleInstance?.formerTime,
        newTime: event.rescheduleInstance?.newTime,
      });

      // Fetch the master event to check if it's recurring and get etag
      const existingEventResponse = await this.fetcher(`/calendars/${calendarId}/events/${uid}`);
      const existingEventData = await this.handleData(existingEventResponse, this.log);

      if (!existingEventData.events || existingEventData.events.length === 0) {
        throw new Error("Event not found");
      }

      // Find the master recurring event (has rrule, no recurrenceid, not deleted)
      const existingEvent = existingEventData.events.find((e) => e.rrule && !e.recurrenceid && !e.estatus);

      // Check if this is a recurring event (has rrule field)
      if (!existingEvent) {
        this.log.warn("Event is not recurring, performing normal update", { uid });
        return await this.updateEvent(uid, event, calendarId);
      }

      // Use /byinstance API to get all instances within a time window around the former time
      const formerTime = new Date(event.rescheduleInstance!.formerTime);
      const searchStart = dayjs(formerTime).subtract(1, "day").toISOString();
      const searchEnd = dayjs(formerTime).add(1, "day").toISOString();

      const instances = await this.getRecurringEventInstances(calendarId, uid, searchStart, searchEnd);

      if (!instances || instances.length === 0) {
        throw new Error(`No instances found for recurring event ${uid}`);
      }

      // Find the instance that matches the formerTime
      const formerTimeMs = formerTime.getTime();
      const targetInstance = instances.find((instance) => {
        const instanceStartStr = instance.dateandtime.start;
        let instanceStartMs;

        // Check if it's in the compact iCalendar format (e.g., "20251110T150000+0530")
        if (typeof instanceStartStr === "string" && /^\d{8}T\d{6}[+-]\d{4}$/.test(instanceStartStr)) {
          // Parse with Day.js using custom format
          instanceStartMs = dayjs(instanceStartStr, "YYYYMMDDTHHmmssZ").valueOf();
        } else {
          // Fallback to direct parsing
          instanceStartMs = dayjs(instanceStartStr).valueOf();
        }

        return Math.abs(instanceStartMs - formerTimeMs) < 60000; // Within 1 minute
      });

      if (!targetInstance) {
        this.log.error("Could not find matching instance", {
          uid,
          formerTime: event.rescheduleInstance!.formerTime,
          formerTimeMs,
          availableInstances: instances.map((i) => ({
            raw: i.dateandtime.start,
            parsed: dayjs(i.dateandtime.start, "YYYYMMDDTHHmmssZ").toISOString(),
            ms: dayjs(i.dateandtime.start, "YYYYMMDDTHHmmssZ").valueOf(),
          })),
        });
        throw new Error(`Could not find instance at ${event.rescheduleInstance!.formerTime}`);
      }

      // The recurrenceid from the instance response
      const recurrenceid = targetInstance.recurrenceid;

      this.log.debug("Found target instance for update", {
        recurrenceid,
        instanceStart: targetInstance.dateandtime.start,
        currentEtag: existingEvent.etag,
      });

      // Build the update payload with new event details
      const translatedEvent = this.translateEvent(event);

      const updatePayload = {
        ...translatedEvent,
        etag: existingEvent.etag,
        recurrenceid: recurrenceid, // Use the recurrenceid from the instance
        recurrence_edittype: "only", // Update only this occurrence
      };

      const query = stringify({
        eventdata: JSON.stringify(updatePayload),
      });

      const eventResponse = await this.fetcher(`/calendars/${calendarId}/events/${uid}?${query}`, {
        method: "PUT",
      });

      const eventRespData = await this.handleData(eventResponse, this.log);

      this.log.info("Successfully updated recurring instance", {
        uid,
        recurrenceid,
        newStart: event.startTime,
        newEnd: event.endTime,
      });

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
      this.log.error("Error updating specific recurring instance", {
        error,
        uid,
        formerTime: event.rescheduleInstance?.formerTime,
        newTime: event.rescheduleInstance?.newTime,
      });
      throw error;
    }
  }

  /**
   * Cancels specific instances of a recurring event using /byinstance API
   * Based on:
   * - https://www.zoho.com/calendar/help/api/delete-event.html
   * - https://www.zoho.com/calendar/help/api/get-event-by-instance.html
   *
   * Process:
   * 1. Use /byinstance API to get instances for each cancelled date
   * 2. Delete each instance with its recurrenceid and recurrence_edittype="only"
   */
  private async cancelSpecificInstances(
    uid: string,
    cancelledDates: string[],
    calendarId: string
  ): Promise<void> {
    try {
      this.log.debug("Cancelling specific instances", {
        uid,
        cancelledDatesCount: cancelledDates.length,
      });

      // Fetch the master event to get etag and check if recurring
      let masterEventResponse = await this.fetcher(`/calendars/${calendarId}/events/${uid}`);
      let masterEventData = await this.handleData(masterEventResponse, this.log);

      if (!masterEventData.events || masterEventData.events.length === 0) {
        throw new Error("Master recurring event not found");
      }

      let masterEvent = masterEventData.events.find((e) => e.rrule && !e.recurrenceid && !e.estatus);

      if (!masterEvent) {
        throw new Error("Could not find master recurring event");
      }

      // Cancel instances SEQUENTIALLY to avoid etag conflicts
      const cancellationResults: Array<{
        cancelledDate: string;
        recurrenceid?: string;
        success: boolean;
        error?: string;
      }> = [];

      for (const cancelledDate of cancelledDates) {
        try {
          const cancelledDateTime = new Date(cancelledDate);

          // Use /byinstance API to get instances around this date
          const searchStart = dayjs(cancelledDateTime).subtract(1, "day").toISOString();
          const searchEnd = dayjs(cancelledDateTime).add(1, "day").toISOString();

          const instances = await this.getRecurringEventInstances(calendarId, uid, searchStart, searchEnd);

          // Find the matching instance
          const cancelledTimeMs = cancelledDateTime.getTime();
          const targetInstance = instances.find((instance) => {
            const instanceStartStr = instance.dateandtime.start;
            let instanceStartMs;

            // Check if it's in the compact iCalendar format (e.g., "20251110T150000+0530")
            if (typeof instanceStartStr === "string" && /^\d{8}T\d{6}[+-]\d{4}$/.test(instanceStartStr)) {
              // Parse with Day.js using custom format
              instanceStartMs = dayjs(instanceStartStr, "YYYYMMDDTHHmmssZ").valueOf();
            } else {
              // Fallback to direct parsing
              instanceStartMs = dayjs(instanceStartStr).valueOf();
            }

            return Math.abs(instanceStartMs - cancelledTimeMs) < 60000; // Within 1 minute
          });

          if (!targetInstance) {
            this.log.warn("Could not find instance to cancel", {
              cancelledDate,
              cancelledTimeMs,
              availableInstances: instances.map((i) => ({
                raw: i.dateandtime.start,
                parsed: dayjs(i.dateandtime.start, "YYYYMMDDTHHmmssZ").toISOString(),
                ms: dayjs(i.dateandtime.start, "YYYYMMDDTHHmmssZ").valueOf(),
              })),
            });

            cancellationResults.push({
              cancelledDate,
              success: false,
              error: `Could not find instance to cancel for date: ${cancelledDate}`,
            });
            continue;
          }

          // Delete this specific instance using recurrenceid
          const recurrenceid = targetInstance.recurrenceid;

          this.log.debug("Deleting instance", {
            cancelledDate,
            recurrenceid,
            uid,
            currentEtag: masterEvent.etag,
          });

          // Build eventdata with uid and recurrenceid
          const eventdata = {
            uid: uid,
            recurrenceid: recurrenceid,
            etag: masterEvent.etag,
            recurrence_edittype: "only", // Delete only this occurrence
          };

          const query = stringify({
            eventdata: JSON.stringify(eventdata),
          });

          const deleteResponse = await this.fetcher(`/calendars/${calendarId}/events/${uid}?${query}`, {
            method: "DELETE",
            headers: {
              etag: String(masterEvent.etag),
            },
          });

          await this.handleData(deleteResponse, this.log);

          cancellationResults.push({
            cancelledDate,
            recurrenceid,
            success: true,
          });

          // CRITICAL: Refresh the master event to get the updated etag for next cancellation
          if (cancelledDates.indexOf(cancelledDate) < cancelledDates.length - 1) {
            this.log.debug("Refreshing master event etag after successful cancellation");

            masterEventResponse = await this.fetcher(`/calendars/${calendarId}/events/${uid}`);
            masterEventData = await this.handleData(masterEventResponse, this.log);

            const refreshedMaster = masterEventData.events.find(
              (e) => e.rrule && !e.recurrenceid && !e.estatus
            );

            if (refreshedMaster) {
              masterEvent = refreshedMaster;
              this.log.debug("Updated etag", {
                oldEtag: eventdata.etag,
                newEtag: masterEvent.etag,
              });
            } else {
              this.log.warn("Could not refresh master event etag");
            }
          }
        } catch (error) {
          // Log detailed error information
          this.log.error("Failed to cancel instance", {
            cancelledDate,
            uid,
            error: error instanceof Error ? error.message : JSON.stringify(error, null, 2),
            errorDetails: JSON.stringify(error, null, 2),
          });

          cancellationResults.push({
            cancelledDate,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const successfulCancellations = cancellationResults.filter((r) => r.success);
      const failedCancellations = cancellationResults.filter((r) => !r.success);

      this.log.info("Completed instance cancellations", {
        uid,
        totalRequested: cancelledDates.length,
        successful: successfulCancellations.length,
        failed: failedCancellations.length,
      });

      if (failedCancellations.length > 0) {
        this.log.warn("Some instance cancellations failed", {
          failures: failedCancellations,
        });
      }
    } catch (error) {
      this.log.error("Error cancelling specific instances", {
        error,
        uid,
        cancelledDatesCount: cancelledDates.length,
      });
      throw error;
    }
  }
}
