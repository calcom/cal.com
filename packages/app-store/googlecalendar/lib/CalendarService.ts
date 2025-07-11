/* eslint-disable @typescript-eslint/no-explicit-any */
import type { calendar_v3 } from "@googleapis/calendar";
import type { GaxiosResponse } from "googleapis-common";
import { RRule } from "rrule";
import { v4 as uuid } from "uuid";

import { MeetLocationType } from "@calcom/app-store/locations";
import { CalendarCache } from "@calcom/features/calendar-cache/calendar-cache";
import type { FreeBusyArgs } from "@calcom/features/calendar-cache/calendar-cache.repository.interface";
import { getTimeMax, getTimeMin } from "@calcom/features/calendar-cache/lib/datesForCache";
import { getLocation, getRichDescription } from "@calcom/lib/CalEventParser";
import { uniqueBy } from "@calcom/lib/array";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type {
  Calendar,
  CalendarServiceEvent,
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";
import type { SelectedCalendarEventTypeIds } from "@calcom/types/Calendar";
import type { CredentialForCalendarServiceWithEmail } from "@calcom/types/Credential";

import { AxiosLikeResponseToFetchResponse } from "../../_utils/oauth/AxiosLikeResponseToFetchResponse";
import { CalendarAuth } from "./CalendarAuth";

const log = logger.getSubLogger({ prefix: ["app-store/googlecalendar/lib/CalendarService"] });

interface GoogleCalError extends Error {
  code?: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ONE_MONTH_IN_MS = 30 * MS_PER_DAY;
// eslint-disable-next-line turbo/no-undeclared-env-vars -- GOOGLE_WEBHOOK_URL only for local testing
const GOOGLE_WEBHOOK_URL_BASE = process.env.GOOGLE_WEBHOOK_URL || process.env.NEXT_PUBLIC_WEBAPP_URL;
const GOOGLE_WEBHOOK_URL = `${GOOGLE_WEBHOOK_URL_BASE}/api/integrations/googlecalendar/webhook`;

const isGaxiosResponse = (error: unknown): error is GaxiosResponse<calendar_v3.Schema$Event> =>
  typeof error === "object" && !!error && error.hasOwnProperty("config");

type GoogleChannelProps = {
  kind?: string | null;
  id?: string | null;
  resourceId?: string | null;
  resourceUri?: string | null;
  expiration?: string | null;
};

export default class GoogleCalendarService implements Calendar {
  private integrationName = "";
  private auth: CalendarAuth;
  private log: typeof logger;
  private credential: CredentialForCalendarServiceWithEmail;

  constructor(credential: CredentialForCalendarServiceWithEmail) {
    this.integrationName = "google_calendar";
    this.credential = credential;
    this.auth = new CalendarAuth(credential);
    this.log = log.getSubLogger({ prefix: [`[[lib] ${this.integrationName}`] });
  }

  public getCredentialId() {
    return this.credential.id;
  }

  public async authedCalendar(): Promise<calendar_v3.Calendar> {
    this.log.debug("Getting authed calendar");
    return this.auth.getClient();
  }

  private getAttendees = ({
    event,
    hostExternalCalendarId,
  }: {
    event: CalendarEvent;
    hostExternalCalendarId?: string;
  }) => {
    // When rescheduling events we know the external id of the calendar so we can just look for it in the destinationCalendar array.
    const selectedHostDestinationCalendar = event.destinationCalendar?.find(
      (cal) => cal.credentialId === this.credential.id
    );
    const eventAttendees = event.attendees.map(({ id: _id, ...rest }) => ({
      ...rest,
      responseStatus: "accepted",
    }));
    const attendees: calendar_v3.Schema$EventAttendee[] = [
      {
        ...event.organizer,
        id: String(event.organizer.id),
        responseStatus: "accepted",
        organizer: true,
        // Tried changing the display name to the user but GCal will not let you do that. It will only display the name of the external calendar. Leaving this in just incase it works in the future.
        displayName: event.organizer.name,
        // We use || instead of ?? here to handle empty strings
        email: hostExternalCalendarId || selectedHostDestinationCalendar?.externalId || event.organizer.email,
      },
      ...eventAttendees,
    ];

    if (event.team?.members) {
      // TODO: Check every other CalendarService for team members
      const teamAttendeesWithoutCurrentUser = event.team.members
        .filter((member) => member.email !== this.credential.user?.email)
        .map((m) => {
          const teamMemberDestinationCalendar = event.destinationCalendar?.find(
            (calendar) => calendar.integration === "google_calendar" && calendar.userId === m.id
          );
          return {
            email: teamMemberDestinationCalendar?.externalId ?? m.email,
            displayName: m.name,
            responseStatus: "accepted",
          };
        });
      attendees.push(...teamAttendeesWithoutCurrentUser);
    }

    return attendees;
  };

  private async stopWatchingCalendarsInGoogle(
    channels: { googleChannelResourceId: string | null; googleChannelId: string | null }[]
  ) {
    const calendar = await this.authedCalendar();
    logger.debug(`Unsubscribing from calendars ${channels.map((c) => c.googleChannelId).join(", ")}`);
    const uniqueChannels = uniqueBy(channels, ["googleChannelId", "googleChannelResourceId"]);
    await Promise.allSettled(
      uniqueChannels.map(({ googleChannelResourceId, googleChannelId }) =>
        calendar.channels
          .stop({
            requestBody: {
              resourceId: googleChannelResourceId,
              id: googleChannelId,
            },
          })
          .catch((err) => {
            console.warn(JSON.stringify(err));
          })
      )
    );
  }

  private async startWatchingCalendarsInGoogle({ calendarId }: { calendarId: string }) {
    const calendar = await this.authedCalendar();
    logger.debug(`Subscribing to calendar ${calendarId}`, safeStringify({ GOOGLE_WEBHOOK_URL }));

    const res = await calendar.events.watch({
      // Calendar identifier. To retrieve calendar IDs call the calendarList.list method. If you want to access the primary calendar of the currently logged in user, use the "primary" keyword.
      calendarId,
      requestBody: {
        // A UUID or similar unique string that identifies this channel.
        id: uuid(),
        type: "web_hook",
        address: GOOGLE_WEBHOOK_URL,
        token: process.env.GOOGLE_WEBHOOK_TOKEN,
        params: {
          // The time-to-live in seconds for the notification channel. Default is 604800 seconds.
          ttl: `${Math.round(ONE_MONTH_IN_MS / 1000)}`,
        },
      },
    });
    return res.data;
  }

  async createEvent(
    calEvent: CalendarServiceEvent,
    credentialId: number,
    externalCalendarId?: string
  ): Promise<NewCalendarEventType> {
    this.log.debug("Creating event");

    const payload: calendar_v3.Schema$Event = {
      summary: calEvent.title,
      description: calEvent.calendarDescription,
      start: {
        dateTime: calEvent.startTime,
        timeZone: calEvent.organizer.timeZone,
      },
      end: {
        dateTime: calEvent.endTime,
        timeZone: calEvent.organizer.timeZone,
      },
      attendees: this.getAttendees({ event: calEvent, hostExternalCalendarId: externalCalendarId }),
      reminders: {
        useDefault: true,
      },
      guestsCanSeeOtherGuests: !!calEvent.seatsPerTimeSlot ? calEvent.seatsShowAttendees : true,
      iCalUID: calEvent.iCalUID,
    };
    if (calEvent.hideCalendarEventDetails) {
      payload.visibility = "private";
    }

    if (calEvent.location) {
      payload["location"] = getLocation(calEvent);
    }

    if (calEvent.recurringEvent) {
      const rule = new RRule({
        freq: calEvent.recurringEvent.freq,
        interval: calEvent.recurringEvent.interval,
        count: calEvent.recurringEvent.count,
      });

      payload["recurrence"] = [rule.toString()];
    }

    if (calEvent.conferenceData && calEvent.location === MeetLocationType) {
      payload["conferenceData"] = calEvent.conferenceData;
    }
    const calendar = await this.authedCalendar();
    // Find in formattedCalEvent.destinationCalendar the one with the same credentialId

    const selectedCalendar =
      externalCalendarId ??
      (calEvent.destinationCalendar?.find((cal) => cal.credentialId === credentialId)?.externalId ||
        "primary");

    try {
      let event: calendar_v3.Schema$Event | undefined;
      let recurringEventId = null;
      if (calEvent.existingRecurringEvent) {
        recurringEventId = calEvent.existingRecurringEvent.recurringEventId;
        const recurringEventInstances = await calendar.events.instances({
          calendarId: selectedCalendar,
          eventId: calEvent.existingRecurringEvent.recurringEventId,
        });
        if (recurringEventInstances.data.items) {
          // Compare timestamps directly for more reliable and faster matching
          const calComEventStartTimeMs = new Date(calEvent.startTime).getTime();
          for (let i = 0; i < recurringEventInstances.data.items.length; i++) {
            const instance = recurringEventInstances.data.items[i];
            const instanceStartTimeMs = new Date(instance.start?.dateTime || "").getTime();

            if (instanceStartTimeMs === calComEventStartTimeMs) {
              event = instance;
              break;
            }
          }

          if (!event) {
            event = recurringEventInstances.data.items[0];
            this.log.error(
              "Unable to find matching event amongst recurring event instances",
              safeStringify({ selectedCalendar, credentialId })
            );
          }
          await calendar.events.patch({
            calendarId: selectedCalendar,
            eventId: event.id || "",
            requestBody: {
              location: getLocation(calEvent),
              description: calEvent.calendarDescription,
            },
          });
        }
      } else {
        const eventResponse = await calendar.events.insert({
          calendarId: selectedCalendar,
          requestBody: payload,
          conferenceDataVersion: 1,
          sendUpdates: "none",
        });
        event = eventResponse.data;
        if (event.recurrence) {
          if (event.recurrence.length > 0) {
            recurringEventId = event.id;
            event = await this.getFirstEventInRecurrence(recurringEventId, selectedCalendar, calendar);
          }
        }
      }

      if (event && event.id && event.hangoutLink) {
        await calendar.events.patch({
          // Update the same event but this time we know the hangout link
          calendarId: selectedCalendar,
          eventId: event.id || "",
          requestBody: {
            description: getRichDescription({
              ...calEvent,
              additionalInformation: { hangoutLink: event.hangoutLink },
            }),
          },
        });
      }

      return {
        uid: "",
        ...event,
        id: event?.id || "",
        thirdPartyRecurringEventId: recurringEventId,
        additionalInfo: {
          hangoutLink: event?.hangoutLink || "",
        },
        type: "google_calendar",
        password: "",
        url: "",
        iCalUID: event?.iCalUID,
      };
    } catch (error) {
      if (isGaxiosResponse(error)) {
        // Prevent clogging up the logs with the body of the request
        // Plus, we already have this data in error.data.summary
        delete error.config.body;
      }
      this.log.error(
        "There was an error creating event in google calendar: ",
        safeStringify({ error, selectedCalendar, credentialId })
      );
      throw error;
    }
  }
  async getFirstEventInRecurrence(
    recurringEventId: string | null | undefined,
    selectedCalendar: string,
    calendar: calendar_v3.Calendar
  ): Promise<calendar_v3.Schema$Event> {
    const recurringEventInstances = await calendar.events.instances({
      calendarId: selectedCalendar,
      eventId: recurringEventId || "",
    });

    if (recurringEventInstances.data.items) {
      return recurringEventInstances.data.items[0];
    } else {
      return {} as calendar_v3.Schema$Event;
    }
  }

  async updateEvent(uid: string, event: CalendarServiceEvent, externalCalendarId: string): Promise<any> {
    const payload: calendar_v3.Schema$Event = {
      summary: event.title,
      description: event.calendarDescription,
      start: {
        dateTime: event.startTime,
        timeZone: event.organizer.timeZone,
      },
      end: {
        dateTime: event.endTime,
        timeZone: event.organizer.timeZone,
      },
      attendees: this.getAttendees({ event, hostExternalCalendarId: externalCalendarId }),
      reminders: {
        useDefault: true,
      },
      guestsCanSeeOtherGuests: !!event.seatsPerTimeSlot ? event.seatsShowAttendees : true,
    };

    if (event.location) {
      payload["location"] = getLocation(event);
    }

    if (event.conferenceData && event.location === MeetLocationType) {
      payload["conferenceData"] = event.conferenceData;
    }

    const calendar = await this.authedCalendar();

    const selectedCalendar =
      (externalCalendarId
        ? event.destinationCalendar?.find((cal) => cal.externalId === externalCalendarId)?.externalId
        : undefined) || "primary";

    try {
      const evt = await calendar.events.update({
        calendarId: selectedCalendar,
        eventId: uid,
        sendNotifications: true,
        sendUpdates: "none",
        requestBody: payload,
        conferenceDataVersion: 1,
      });

      this.log.debug("Updated Google Calendar Event", {
        startTime: evt?.data.start,
        endTime: evt?.data.end,
      });

      if (evt && evt.data.id && evt.data.hangoutLink && event.location === MeetLocationType) {
        calendar.events.patch({
          // Update the same event but this time we know the hangout link
          calendarId: selectedCalendar,
          eventId: evt.data.id || "",
          requestBody: {
            description: getRichDescription({
              ...event,
              additionalInformation: { hangoutLink: evt.data.hangoutLink },
            }),
          },
        });
        return {
          uid: "",
          ...evt.data,
          id: evt.data.id || "",
          additionalInfo: {
            hangoutLink: evt.data.hangoutLink || "",
          },
          type: "google_calendar",
          password: "",
          url: "",
          iCalUID: evt.data.iCalUID,
        };
      }
      return evt?.data;
    } catch (error) {
      this.log.error(
        "There was an error updating event in google calendar: ",
        safeStringify({ error, event, uid })
      );
      throw error;
    }
  }

  async deleteEvent(uid: string, event: CalendarEvent, externalCalendarId?: string | null): Promise<void> {
    const calendar = await this.authedCalendar();

    const selectedCalendar = externalCalendarId || "primary";

    try {
      const event = await calendar.events.delete({
        calendarId: selectedCalendar,
        eventId: uid,
        sendNotifications: false,
        sendUpdates: "none",
      });
      return event?.data;
    } catch (error) {
      this.log.error(
        "There was an error deleting event from google calendar: ",
        safeStringify({ error, event, externalCalendarId })
      );
      const err = error as GoogleCalError;
      /**
       *  410 is when an event is already deleted on the Google cal before on cal.com
       *  404 is when the event is on a different calendar
       */
      if (err.code === 410) return;
      console.error("There was an error contacting google calendar service: ", err);
      if (err.code === 404) return;
      throw err;
    }
  }

  async fetchAvailability(requestBody: FreeBusyArgs): Promise<calendar_v3.Schema$FreeBusyResponse> {
    log.debug("fetchAvailability", safeStringify({ requestBody }));
    const calendar = await this.authedCalendar();
    const apiResponse = await this.auth.authManager.request(
      async () => new AxiosLikeResponseToFetchResponse(await calendar.freebusy.query({ requestBody }))
    );
    return apiResponse.json;
  }

  async fetchEventsIncremental(
    calendarId: string,
    syncToken?: string
  ): Promise<{ events: calendar_v3.Schema$Event[]; nextSyncToken?: string }> {
    log.debug("fetchEventsIncremental", safeStringify({ calendarId, syncToken }));
    const calendar = await this.authedCalendar();

    try {
      const allEvents: calendar_v3.Schema$Event[] = [];
      let pageToken: string | undefined;
      let nextSyncToken: string | undefined;

      do {
        const response = await calendar.events.list({
          calendarId,
          syncToken,
          pageToken,
          singleEvents: true,
          maxResults: 2500,
        });

        if (response.data.items) {
          allEvents.push(...response.data.items);
        }

        pageToken = response.data.nextPageToken || undefined;
        nextSyncToken = response.data.nextSyncToken || undefined;
      } while (pageToken);

      return {
        events: allEvents,
        nextSyncToken,
      };
    } catch (error) {
      const err = error as GoogleCalError;
      if (err.code === 410) {
        log.info("Sync token expired, performing full resync", { calendarId });

        const allEvents: calendar_v3.Schema$Event[] = [];
        let pageToken: string | undefined;
        let nextSyncToken: string | undefined;

        do {
          const response = await calendar.events.list({
            calendarId,
            pageToken,
            singleEvents: true,
            maxResults: 2500,
          });

          if (response.data.items) {
            allEvents.push(...response.data.items);
          }

          pageToken = response.data.nextPageToken || undefined;
          nextSyncToken = response.data.nextSyncToken || undefined;
        } while (pageToken);

        return {
          events: allEvents,
          nextSyncToken,
        };
      }
      throw err;
    }
  }

  private convertEventsToBusyTimes(events: calendar_v3.Schema$Event[]): EventBusyDate[] {
    const busyTimes: EventBusyDate[] = [];

    for (const event of events) {
      if (event.status === "cancelled" || !event.start || !event.end) {
        continue;
      }

      if (!event.start.dateTime || !event.end.dateTime) {
        continue;
      }

      busyTimes.push({
        start: event.start.dateTime,
        end: event.end.dateTime,
      });
    }

    return busyTimes;
  }

  async getFreeBusyResult(
    args: FreeBusyArgs,
    shouldServeCache?: boolean
  ): Promise<calendar_v3.Schema$FreeBusyResponse> {
    if (shouldServeCache === false) return await this.fetchAvailability(args);
    const calendarCache = await CalendarCache.init(null);
    const cached = await calendarCache.getCachedAvailability({
      credentialId: this.credential.id,
      userId: this.credential.userId,
      args: {
        // Expand the start date to the start of the month to increase cache hits
        timeMin: getTimeMin(args.timeMin),
        // Expand the end date to the end of the month to increase cache hits
        timeMax: getTimeMax(args.timeMax),
        items: args.items,
      },
    });
    if (cached) {
      log.debug("[Cache Hit] Returning cached freebusy result", safeStringify({ cached, args }));
      return cached.value as unknown as calendar_v3.Schema$FreeBusyResponse;
    }
    log.debug("[Cache Miss] Fetching freebusy result", safeStringify({ args }));
    return await this.fetchAvailability(args);
  }

  getValidCalendars<T extends { id?: string | null }>(cals: T[]) {
    return cals.filter((cal): cal is T & { id: string } => !!cal.id);
  }

  filterPrimaryCalendar(cals: calendar_v3.Schema$CalendarListEntry[]) {
    const validCals = this.getValidCalendars(cals);
    const primaryCal = validCals.find((cal) => !!cal.primary);
    if (primaryCal) {
      return primaryCal;
    }
    return validCals[0];
  }

  async getCacheOrFetchAvailability(
    args: FreeBusyArgs,
    shouldServeCache?: boolean
  ): Promise<(EventBusyDate & { id: string })[] | null> {
    const freeBusyResult = await this.getFreeBusyResult(args, shouldServeCache);
    if (!freeBusyResult.calendars) return null;

    const result = Object.entries(freeBusyResult.calendars).reduce((c, [id, i]) => {
      i.busy?.forEach((busyTime) => {
        c.push({
          id,
          start: busyTime.start || "",
          end: busyTime.end || "",
        });
      });
      return c;
    }, [] as (EventBusyDate & { id: string })[]);

    return result;
  }

  async getAvailabilityWithTimeZones(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[],
    /**
     * If true, we will fallback to the primary calendar if no valid selected calendars are found
     */
    fallbackToPrimary?: boolean
  ): Promise<{ start: Date | string; end: Date | string; timeZone: string }[]> {
    const calendar = await this.authedCalendar();
    const selectedCalendarIds = selectedCalendars
      .filter((e) => e.integration === this.integrationName)
      .map((e) => e.externalId);
    if (selectedCalendarIds.length === 0 && selectedCalendars.length > 0) {
      // Only calendars of other integrations selected
      return [];
    }

    const getCalIdsWithTimeZone = async () => {
      const cals = await this.getAllCalendars(calendar, ["id", "timeZone"]);
      if (!cals.length) return [];

      if (selectedCalendarIds.length !== 0) {
        return selectedCalendarIds.map((selectedCalendarId) => {
          const calWithTz = cals.find((cal) => cal.id === selectedCalendarId);
          return {
            id: selectedCalendarId,
            timeZone: calWithTz?.timeZone || "",
          };
        });
      }
      if (!fallbackToPrimary) return [];

      const primaryCalendar = this.filterPrimaryCalendar(cals);
      if (!primaryCalendar) return [];
      return [
        {
          id: primaryCalendar.id,
          timeZone: primaryCalendar.timeZone || "",
        },
      ];
    };

    try {
      const calIdsWithTimeZone = await getCalIdsWithTimeZone();
      const calIds = calIdsWithTimeZone.map((calIdWithTimeZone) => ({ id: calIdWithTimeZone.id }));
      const freeBusyData = await this.getCacheOrFetchAvailability({
        timeMin: dateFrom,
        timeMax: dateTo,
        items: calIds,
      });
      if (!freeBusyData) throw new Error("No response from google calendar");

      const timeZoneMap = new Map(calIdsWithTimeZone.map((cal) => [cal.id, cal.timeZone]));

      const freeBusyDataWithTimeZone = freeBusyData.map((freeBusy) => {
        return {
          start: freeBusy.start,
          end: freeBusy.end,
          timeZone: timeZoneMap.get(freeBusy.id) || "",
        };
      });

      return freeBusyDataWithTimeZone;
    } catch (error) {
      this.log.error(
        "There was an error getting availability from google calendar: ",
        safeStringify({ error, selectedCalendars })
      );
      throw error;
    }
  }

  /**
   * Converts FreeBusy response data to EventBusyDate array
   */
  private convertFreeBusyToEventBusyDates(
    freeBusyResult: calendar_v3.Schema$FreeBusyResponse
  ): EventBusyDate[] {
    if (!freeBusyResult.calendars) return [];

    return Object.values(freeBusyResult.calendars).flatMap(
      (calendar) =>
        calendar.busy?.map((busyTime) => ({
          start: busyTime.start || "",
          end: busyTime.end || "",
        })) || []
    );
  }

  /**
   * Attempts to get availability from cache
   */
  private async tryGetAvailabilityFromCache(
    timeMin: string,
    timeMax: string,
    calendarIds: string[]
  ): Promise<EventBusyDate[] | null> {
    try {
      const calendarCache = await CalendarCache.init(null);

      // First try to find exact match for multi-calendar query
      const cached = await calendarCache.getCachedAvailability({
        credentialId: this.credential.id,
        userId: this.credential.userId,
        args: {
          // Expand the start date to the start of the month to increase cache hits
          timeMin: getTimeMin(timeMin),
          // Expand the end date to the end of the month to increase cache hits
          timeMax: getTimeMax(timeMax),
          items: calendarIds.map((id) => ({ id })),
        },
      });

      if (cached) {
        this.log.debug(
          "[Cache Hit] Returning cached availability result",
          safeStringify({ timeMin, timeMax, calendarIds })
        );
        const freeBusyResult = cached.value as unknown as calendar_v3.Schema$FreeBusyResponse;
        return this.convertFreeBusyToEventBusyDates(freeBusyResult);
      }

      // If multi-calendar cache miss and we have multiple calendars, try individual cache entries
      if (calendarIds.length > 1) {
        const individualCacheEntries: EventBusyDate[] = [];
        let allIndividualCacheHits = true;

        for (const calendarId of calendarIds) {
          const individualCached = await calendarCache.getCachedAvailability({
            credentialId: this.credential.id,
            userId: this.credential.userId,
            args: {
              timeMin: getTimeMin(timeMin),
              timeMax: getTimeMax(timeMax),
              items: [{ id: calendarId }],
            },
          });

          if (individualCached) {
            const freeBusyResult = individualCached.value as unknown as calendar_v3.Schema$FreeBusyResponse;
            const busyTimes = this.convertFreeBusyToEventBusyDates(freeBusyResult);
            individualCacheEntries.push(...busyTimes);
          } else {
            allIndividualCacheHits = false;
            break;
          }
        }

        if (allIndividualCacheHits) {
          this.log.debug(
            "[Cache Hit] Merged individual calendar cache entries for multi-calendar query",
            safeStringify({ timeMin, timeMax, calendarIds })
          );
          return individualCacheEntries;
        }
      }

      return null;
    } catch (error) {
      this.log.debug("Cache check failed, proceeding with API call", safeStringify(error));
      return null;
    }
  }

  /**
   * Gets calendar IDs for the request, either from selected calendars or fallback logic
   */
  private async getCalendarIds(
    selectedCalendarIds: string[],
    fallbackToPrimary?: boolean
  ): Promise<string[]> {
    if (selectedCalendarIds.length !== 0) return selectedCalendarIds;

    const calendar = await this.authedCalendar();
    const cals = await this.getAllCalendars(calendar, ["id", "primary"]);
    if (!cals.length) return [];

    if (!fallbackToPrimary) {
      return this.getValidCalendars(cals).map((cal) => cal.id);
    }

    const primaryCalendar = this.filterPrimaryCalendar(cals);
    return primaryCalendar ? [primaryCalendar.id] : [];
  }

  /**
   * Fetches availability data using the cache-or-fetch pattern
   */
  private async fetchAvailabilityData(
    calendarIds: string[],
    dateFrom: string,
    dateTo: string,
    shouldServeCache?: boolean
  ): Promise<EventBusyDate[]> {
    // More efficient date difference calculation using native Date objects
    // Use Math.floor to match dayjs diff behavior (truncates, doesn't round up)
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    const oneDayMs = 1000 * 60 * 60 * 24;
    const diff = Math.floor((toDate.getTime() - fromDate.getTime()) / oneDayMs);

    // Google API only allows a date range of 90 days for /freebusy
    if (diff <= 90) {
      const freeBusyData = await this.getCacheOrFetchAvailability(
        {
          timeMin: dateFrom,
          timeMax: dateTo,
          items: calendarIds.map((id) => ({ id })),
        },
        shouldServeCache
      );

      if (!freeBusyData) throw new Error("No response from google calendar");
      return freeBusyData.map((freeBusy) => ({ start: freeBusy.start, end: freeBusy.end }));
    }

    // Handle longer periods by chunking into 90-day periods
    const busyData: EventBusyDate[] = [];
    const loopsNumber = Math.ceil(diff / 90);
    let currentStartTime = fromDate.getTime();
    const originalEndTime = toDate.getTime();
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    const oneMinuteMs = 60 * 1000;

    for (let i = 0; i < loopsNumber; i++) {
      let currentEndTime = currentStartTime + ninetyDaysMs;

      // Don't go beyond the original end date
      if (currentEndTime > originalEndTime) {
        currentEndTime = originalEndTime;
      }

      const chunkData = await this.getCacheOrFetchAvailability(
        {
          timeMin: new Date(currentStartTime).toISOString(),
          timeMax: new Date(currentEndTime).toISOString(),
          items: calendarIds.map((id) => ({ id })),
        },
        shouldServeCache
      );

      if (chunkData) {
        busyData.push(...chunkData.map((freeBusy) => ({ start: freeBusy.start, end: freeBusy.end })));
      }

      currentStartTime = currentEndTime + oneMinuteMs;
    }

    return busyData;
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[],
    shouldServeCache?: boolean,
    /**
     * If true, we will fallback to the primary calendar if no valid selected calendars are found
     */
    fallbackToPrimary?: boolean
  ): Promise<EventBusyDate[]> {
    this.log.debug("Getting availability", safeStringify({ dateFrom, dateTo, selectedCalendars }));

    const selectedCalendarIds = selectedCalendars
      .filter((e) => e.integration === this.integrationName)
      .map((e) => e.externalId);

    // Early return if only other integrations are selected
    if (selectedCalendarIds.length === 0 && selectedCalendars.length > 0) {
      return [];
    }

    // Try cache first when we have selected calendar IDs
    if (selectedCalendarIds.length > 0 && shouldServeCache !== false) {
      const cachedResult = await this.tryGetAvailabilityFromCache(dateFrom, dateTo, selectedCalendarIds);
      if (cachedResult) {
        return cachedResult;
      }
    }

    // Cache miss - proceed with API calls
    this.log.debug(
      "[Cache Miss] Proceeding with Google API calls",
      safeStringify({ selectedCalendarIds, fallbackToPrimary })
    );

    try {
      const calendarIds = await this.getCalendarIds(selectedCalendarIds, fallbackToPrimary);
      return await this.fetchAvailabilityData(calendarIds, dateFrom, dateTo, shouldServeCache);
    } catch (error) {
      this.log.error(
        "There was an error getting availability from google calendar: ",
        safeStringify({ error, selectedCalendars })
      );
      throw error;
    }
  }

  async listCalendars(): Promise<IntegrationCalendar[]> {
    this.log.debug("Listing calendars");
    const calendar = await this.authedCalendar();
    try {
      const { json: cals } = await this.auth.authManager.request(
        async () =>
          new AxiosLikeResponseToFetchResponse({
            status: 200,
            statusText: "OK",
            data: {
              items: await this.getAllCalendars(calendar),
            },
          })
      );

      if (!cals.items) return [];
      return cals.items.map(
        (cal) =>
          ({
            externalId: cal.id ?? "No id",
            integration: this.integrationName,
            name: cal.summary ?? "No name",
            primary: cal.primary ?? false,
            readOnly: !(cal.accessRole === "writer" || cal.accessRole === "owner") && true,
            email: cal.id ?? "",
          } satisfies IntegrationCalendar)
      );
    } catch (error) {
      this.log.error("There was an error getting calendars: ", safeStringify(error));
      throw error;
    }
  }

  // It would error if the delegation credential is not set up correctly
  async testDelegationCredentialSetup() {
    log.debug("Testing delegation credential setup");
    const calendar = await this.authedCalendar();
    const cals = await calendar.calendarList.list({ fields: "items(id)" });
    return !!cals.data.items;
  }

  /**
   * calendarId is the externalId for the SelectedCalendar
   * It doesn't check if the subscription has expired or not.
   * It just creates a new subscription.
   */
  async watchCalendar({
    calendarId,
    eventTypeIds,
  }: {
    calendarId: string;
    eventTypeIds: SelectedCalendarEventTypeIds;
  }) {
    log.debug("watchCalendar", safeStringify({ calendarId, eventTypeIds }));
    if (!process.env.GOOGLE_WEBHOOK_TOKEN) {
      log.warn("GOOGLE_WEBHOOK_TOKEN is not set, skipping watching calendar");
      return;
    }

    const allCalendarsWithSubscription = await SelectedCalendarRepository.findMany({
      where: {
        credentialId: this.credential.id,
        externalId: calendarId,
        integration: this.integrationName,
        googleChannelId: {
          not: null,
        },
      },
    });

    const otherCalendarsWithSameSubscription = allCalendarsWithSubscription.filter(
      (sc) => !eventTypeIds?.includes(sc.eventTypeId)
    );

    let googleChannelProps: GoogleChannelProps = otherCalendarsWithSameSubscription.length
      ? {
          kind: otherCalendarsWithSameSubscription[0].googleChannelKind,
          id: otherCalendarsWithSameSubscription[0].googleChannelId,
          resourceId: otherCalendarsWithSameSubscription[0].googleChannelResourceId,
          resourceUri: otherCalendarsWithSameSubscription[0].googleChannelResourceUri,
          expiration: otherCalendarsWithSameSubscription[0].googleChannelExpiration,
        }
      : {};

    if (!otherCalendarsWithSameSubscription.length) {
      try {
        googleChannelProps = await this.startWatchingCalendarsInGoogle({ calendarId });
      } catch (error) {
        this.log.error(`Failed to watch calendar ${calendarId}`, safeStringify(error));
        throw error;
      }
    } else {
      logger.info(
        `Calendar ${calendarId} is already being watched for event types ${otherCalendarsWithSameSubscription.map(
          (sc) => sc.eventTypeId
        )}. So, not watching again and instead reusing the existing channel`
      );
    }
    // FIXME: We shouldn't create SelectedCalendar, we should only update if exists
    await this.upsertSelectedCalendarsForEventTypeIds(
      {
        externalId: calendarId,
        googleChannelId: googleChannelProps.id,
        googleChannelKind: googleChannelProps.kind,
        googleChannelResourceId: googleChannelProps.resourceId,
        googleChannelResourceUri: googleChannelProps.resourceUri,
        googleChannelExpiration: googleChannelProps.expiration,
      },
      eventTypeIds
    );
    return googleChannelProps;
  }

  /**
   * GoogleChannel subscription is only stopped when all selectedCalendars are un-watched.
   */
  async unwatchCalendar({
    calendarId,
    eventTypeIds,
  }: {
    calendarId: string;
    eventTypeIds: SelectedCalendarEventTypeIds;
  }) {
    const credentialId = this.credential.id;
    const eventTypeIdsToBeUnwatched = eventTypeIds;

    const calendarsWithSameCredentialId = await SelectedCalendarRepository.findMany({
      where: {
        credentialId,
      },
    });

    const calendarWithSameExternalId = calendarsWithSameCredentialId.filter(
      (sc) => sc.externalId === calendarId && sc.integration === this.integrationName
    );

    const calendarsWithSameExternalIdThatAreBeingWatched = calendarWithSameExternalId.filter(
      (sc) => !!sc.googleChannelId
    );

    // Except those requested to be un-watched, other calendars are still being watched
    const calendarsWithSameExternalIdToBeStillWatched = calendarsWithSameExternalIdThatAreBeingWatched.filter(
      (sc) => !eventTypeIdsToBeUnwatched.includes(sc.eventTypeId)
    );

    if (calendarsWithSameExternalIdToBeStillWatched.length) {
      logger.info(
        `There are other ${calendarsWithSameExternalIdToBeStillWatched.length} calendars with the same externalId_credentialId. Not unwatching. Just removing the channelId from this selected calendar`
      );

      // CalendarCache still need to exist
      // We still need to keep the subscription

      // Just remove the google channel related fields from this selected calendar
      await this.upsertSelectedCalendarsForEventTypeIds(
        {
          externalId: calendarId,
          googleChannelId: null,
          googleChannelKind: null,
          googleChannelResourceId: null,
          googleChannelResourceUri: null,
          googleChannelExpiration: null,
        },
        eventTypeIdsToBeUnwatched
      );
      return;
    }

    const allChannelsForThisCalendarBeingUnwatched = calendarsWithSameExternalIdThatAreBeingWatched.map(
      (sc) => ({
        googleChannelResourceId: sc.googleChannelResourceId,
        googleChannelId: sc.googleChannelId,
      })
    );

    // Delete the calendar cache to force a fresh cache
    await prisma.calendarCache.deleteMany({ where: { credentialId } });
    await this.stopWatchingCalendarsInGoogle(allChannelsForThisCalendarBeingUnwatched);
    await this.upsertSelectedCalendarsForEventTypeIds(
      {
        externalId: calendarId,
        googleChannelId: null,
        googleChannelKind: null,
        googleChannelResourceId: null,
        googleChannelResourceUri: null,
        googleChannelExpiration: null,
      },
      eventTypeIdsToBeUnwatched
    );

    // Populate the cache back for the remaining calendars, if any
    const remainingCalendars =
      calendarsWithSameCredentialId.filter(
        (sc) => sc.externalId !== calendarId && sc.integration === this.integrationName
      ) || [];
    if (remainingCalendars.length > 0) {
      await this.fetchAvailabilityAndSetCache(remainingCalendars);
    }
  }

  async setAvailabilityInCache(args: FreeBusyArgs, data: calendar_v3.Schema$FreeBusyResponse): Promise<void> {
    log.debug("setAvailabilityInCache", safeStringify({ args, data }));
    const calendarCache = await CalendarCache.init(null);
    await calendarCache.upsertCachedAvailability({
      credentialId: this.credential.id,
      userId: this.credential.userId,
      args,
      value: JSON.parse(JSON.stringify(data)),
    });
  }

  async setAvailabilityInCacheWithSyncToken(
    calendarIds: { id: string }[],
    busyTimes: EventBusyDate[],
    nextSyncToken?: string
  ) {
    const calendarCache = await CalendarCache.init(this);
    const args = {
      timeMin: getTimeMin(),
      timeMax: getTimeMax(),
      items: calendarIds,
    };

    const freeBusyResponse = {
      calendars: calendarIds.reduce((acc, cal) => {
        acc[cal.id] = {
          busy: busyTimes.map((bt) => ({
            start: bt.start,
            end: bt.end,
          })),
        };
        return acc;
      }, {} as any),
    };

    await (calendarCache as any).upsertCachedAvailability({
      credentialId: this.credential.id,
      userId: this.credential.userId,
      args,
      value: freeBusyResponse,
      nextSyncToken,
    });
  }

  async fetchAvailabilityAndSetCache(selectedCalendars: IntegrationCalendar[]) {
    this.log.debug("fetchAvailabilityAndSetCache", safeStringify({ selectedCalendars }));
    const selectedCalendarsPerEventType = new Map<
      SelectedCalendarEventTypeIds[number],
      IntegrationCalendar[]
    >();

    // TODO: Should be done outside of CalendarService as it is applicable to all Apps' CalendarServices
    selectedCalendars.reduce((acc, selectedCalendar) => {
      const eventTypeId = selectedCalendar.eventTypeId ?? null;
      const mapValue = selectedCalendarsPerEventType.get(eventTypeId);
      if (mapValue) {
        mapValue.push(selectedCalendar);
      } else {
        acc.set(eventTypeId, [selectedCalendar]);
      }
      return acc;
    }, selectedCalendarsPerEventType);

    for (const [_eventTypeId, selectedCalendars] of Array.from(selectedCalendarsPerEventType.entries())) {
      const parsedArgs = {
        /** Expand the start date to the start of the month to increase cache hits */
        timeMin: getTimeMin(),
        /** Expand the end date to the end of the month to increase cache hits */
        timeMax: getTimeMax(),
        // Dont use eventTypeId in key because it can be used by any eventType
        // The only reason we are building it per eventType is because there can be different groups of calendars to lookup the availability for
        items: selectedCalendars.map((sc) => ({ id: sc.externalId })),
      };
      const data = await this.fetchAvailability(parsedArgs);
      await this.setAvailabilityInCache(parsedArgs, data);
    }
  }

  async fetchAvailabilityAndSetCacheIncremental(selectedCalendars: IntegrationCalendar[]) {
    const calendarCache = await CalendarCache.init(this);

    for (const selectedCalendar of selectedCalendars) {
      try {
        const cached = await calendarCache.getCachedAvailability({
          credentialId: this.credential.id,
          userId: this.credential.userId,
          args: {
            timeMin: getTimeMin(),
            timeMax: getTimeMax(),
            items: [{ id: selectedCalendar.externalId }],
          },
        });

        const existingSyncToken = (cached as any)?.nextSyncToken || undefined;

        const { events, nextSyncToken } = await this.fetchEventsIncremental(
          selectedCalendar.externalId,
          existingSyncToken
        );

        const busyTimes = this.convertEventsToBusyTimes(events);

        await this.setAvailabilityInCacheWithSyncToken(
          [{ id: selectedCalendar.externalId }],
          busyTimes,
          nextSyncToken
        );

        // 🚀 PROACTIVE SIBLING CACHE REFRESH
        await this.refreshSiblingCalendars(selectedCalendar);
      } catch (error) {
        log.error("Error in incremental sync, falling back to full sync", {
          error,
          calendarId: selectedCalendar.externalId,
        });
        await this.fetchAvailabilityAndSetCache([selectedCalendar]);
      }
    }
  }

  /**
   * Proactively refreshes sibling calendars that are used in combination with the updated calendar
   * This ensures that multi-calendar queries will have all individual caches available
   * Only refreshes siblings that don't already have fresh individual cache entries
   */
  private async refreshSiblingCalendars(updatedCalendar: IntegrationCalendar) {
    try {
      const siblingGroups = await this.findSiblingCalendarGroups(updatedCalendar);

      for (const group of siblingGroups) {
        // Skip the calendar we just updated
        const siblingsToRefresh = group.calendars.filter(
          (cal) => cal.externalId !== updatedCalendar.externalId
        );

        // Check cache status for each sibling and only refresh those without fresh cache
        const siblingsNeedingRefresh = await this.filterSiblingsNeedingRefresh(siblingsToRefresh);

        // Refresh only siblings that need it
        for (const sibling of siblingsNeedingRefresh) {
          await this.refreshSingleCalendar(sibling);
        }

        if (siblingsNeedingRefresh.length > 0) {
          this.log.debug(
            `Refreshed ${siblingsNeedingRefresh.length} of ${siblingsToRefresh.length} sibling calendars`,
            {
              refreshed: siblingsNeedingRefresh.map((s) => s.externalId),
              skipped: siblingsToRefresh
                .filter((s) => !siblingsNeedingRefresh.includes(s))
                .map((s) => s.externalId),
            }
          );
        }
      }
    } catch (error) {
      log.error("Error refreshing sibling calendars", {
        error,
        updatedCalendar: updatedCalendar.externalId,
      });
      // Don't throw - sibling refresh is a performance optimization, not critical
    }
  }

  /**
   * Filters sibling calendars to only include those that need cache refresh
   * Checks for existing individual cache entries and their freshness
   */
  private async filterSiblingsNeedingRefresh(
    siblings: { externalId: string; eventTypeId: number | null }[]
  ): Promise<{ externalId: string; eventTypeId: number | null }[]> {
    const siblingsNeedingRefresh: { externalId: string; eventTypeId: number | null }[] = [];

    try {
      const calendarCache = await CalendarCache.init(this);

      for (const sibling of siblings) {
        try {
          // Check if sibling already has a fresh individual cache
          const cached = await calendarCache.getCachedAvailability({
            credentialId: this.credential.id,
            userId: this.credential.userId,
            args: {
              timeMin: getTimeMin(),
              timeMax: getTimeMax(),
              items: [{ id: sibling.externalId }],
            },
          });

          // If no cache exists, refresh is needed
          if (!cached) {
            siblingsNeedingRefresh.push(sibling);
            continue;
          }

          // If cache exists but has no sync token, it's old-style cache - refresh to get sync token
          if (!(cached as any)?.nextSyncToken) {
            this.log.debug(`Sibling ${sibling.externalId} has old-style cache, refreshing to add sync token`);
            siblingsNeedingRefresh.push(sibling);
            continue;
          }

          // Cache exists and has sync token - skip refresh
          this.log.debug(
            `Sibling ${sibling.externalId} already has fresh cache with sync token, skipping refresh`
          );
        } catch (error) {
          // If error checking cache, err on side of caution and refresh
          this.log.debug(`Error checking cache for sibling ${sibling.externalId}, will refresh`, { error });
          siblingsNeedingRefresh.push(sibling);
        }
      }
    } catch (error) {
      // If error with cache init, refresh all siblings as fallback
      this.log.debug("Error initializing cache for sibling check, refreshing all siblings", { error });
      return siblings;
    }

    return siblingsNeedingRefresh;
  }

  /**
   * Finds all calendar groups that contain the given calendar
   */
  private async findSiblingCalendarGroups(calendar: IntegrationCalendar) {
    try {
      // Find all SelectedCalendar records that share the same userId, credentialId, and eventTypeId
      const relatedCalendars = await prisma.selectedCalendar.findMany({
        where: {
          userId: this.credential.userId!,
          credentialId: this.credential.id,
          integration: "google_calendar",
          eventTypeId: calendar.eventTypeId || null,
        },
        select: {
          externalId: true,
          eventTypeId: true,
        },
      });

      if (relatedCalendars.length <= 1) {
        // No siblings found
        return [];
      }

      // Group calendars by eventTypeId (they're all the same in this case, but keeping consistent structure)
      const groups = [
        {
          eventTypeId: calendar.eventTypeId || null,
          calendars: relatedCalendars.map((cal) => ({
            externalId: cal.externalId,
            eventTypeId: cal.eventTypeId,
            integration: "google_calendar" as const,
          })),
        },
      ];

      return groups;
    } catch (error) {
      this.log.debug("Error in sibling discovery", { error });
      return [];
    }
  }

  /**
   * Refreshes a single calendar's cache
   */
  private async refreshSingleCalendar(calendar: { externalId: string; eventTypeId: number | null }) {
    try {
      const calendarCache = await CalendarCache.init(this);

      const cached = await calendarCache.getCachedAvailability({
        credentialId: this.credential.id,
        userId: this.credential.userId,
        args: {
          timeMin: getTimeMin(),
          timeMax: getTimeMax(),
          items: [{ id: calendar.externalId }],
        },
      });

      const existingSyncToken = (cached as any)?.nextSyncToken || undefined;

      const { events, nextSyncToken } = await this.fetchEventsIncremental(
        calendar.externalId,
        existingSyncToken
      );

      const busyTimes = this.convertEventsToBusyTimes(events);

      await this.setAvailabilityInCacheWithSyncToken([{ id: calendar.externalId }], busyTimes, nextSyncToken);

      this.log.debug(`Refreshed sibling calendar: ${calendar.externalId}`);
    } catch (error) {
      log.error("Error refreshing single calendar", {
        error,
        calendarId: calendar.externalId,
      });
      // Don't throw - continue with other siblings
    }
  }

  async createSelectedCalendar(
    data: Omit<Prisma.SelectedCalendarUncheckedCreateInput, "integration" | "credentialId">
  ) {
    return await SelectedCalendarRepository.create({
      ...data,
      integration: this.integrationName,
      credentialId: this.credential.id,
    });
  }

  async upsertSelectedCalendar(
    data: Omit<Prisma.SelectedCalendarUncheckedCreateInput, "integration" | "credentialId" | "userId">
  ) {
    if (!this.credential.userId) {
      logger.error("upsertSelectedCalendar failed. userId is missing.");
      return;
    }
    return await SelectedCalendarRepository.upsert({
      ...data,
      eventTypeId: data.eventTypeId ?? null,
      integration: this.integrationName,
      credentialId: this.credential.id,
      userId: this.credential.userId,
    });
  }

  async upsertSelectedCalendarsForEventTypeIds(
    data: Omit<Prisma.SelectedCalendarUncheckedCreateInput, "integration" | "credentialId" | "userId">,
    eventTypeIds: SelectedCalendarEventTypeIds
  ) {
    log.debug(
      "upsertSelectedCalendarsForEventTypeIds",
      safeStringify({ data, eventTypeIds, credential: this.credential })
    );
    if (!this.credential.userId) {
      logger.error("upsertSelectedCalendarsForEventTypeIds failed. userId is missing.");
      return;
    }

    await SelectedCalendarRepository.upsertManyForEventTypeIds({
      data: {
        ...data,
        integration: this.integrationName,
        credentialId: this.credential.id,
        delegationCredentialId: this.credential.delegatedToId ?? null,
        userId: this.credential.userId,
      },
      eventTypeIds,
    });
  }

  async getAllCalendars(
    calendar: calendar_v3.Calendar,
    fields: string[] = ["id", "summary", "primary", "accessRole"]
  ): Promise<calendar_v3.Schema$CalendarListEntry[]> {
    let allCalendars: calendar_v3.Schema$CalendarListEntry[] = [];
    let pageToken: string | undefined;

    try {
      do {
        const response: any = await calendar.calendarList.list({
          fields: `items(${fields.join(",")}),nextPageToken`,
          pageToken,
          maxResults: 250, // 250 is max
        });

        allCalendars = [...allCalendars, ...(response.data.items ?? [])];
        pageToken = response.data.nextPageToken;
      } while (pageToken);

      return allCalendars;
    } catch (error) {
      logger.error("Error fetching all Google Calendars", { error });
      throw error;
    }
  }

  async getPrimaryCalendar(_calendar?: calendar_v3.Calendar): Promise<calendar_v3.Schema$Calendar | null> {
    try {
      const calendar = _calendar ?? (await this.authedCalendar());
      const response = await calendar.calendars.get({
        calendarId: "primary",
      });
      return response.data;
    } catch (error) {
      // should not be reached because Google Cal always has a primary cal
      logger.error("Error getting primary calendar", { error });
      throw error;
    }
  }
}
