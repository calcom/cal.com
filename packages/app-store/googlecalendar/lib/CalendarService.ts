/* eslint-disable @typescript-eslint/no-explicit-any */
import type { calendar_v3 } from "@googleapis/calendar";
import type { Prisma } from "@prisma/client";
import type { GaxiosResponse } from "googleapis-common";
import { RRule } from "rrule";
import { v4 as uuid } from "uuid";

import { MeetLocationType } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
import { CalendarCache } from "@calcom/features/calendar-cache/calendar-cache";
import type { FreeBusyArgs } from "@calcom/features/calendar-cache/calendar-cache.repository.interface";
import { getTimeMax, getTimeMin } from "@calcom/features/calendar-cache/lib/datesForCache";
import { getLocation, getRichDescription } from "@calcom/lib/CalEventParser";
import { uniqueBy } from "@calcom/lib/array";
import { formatCalEvent } from "@calcom/lib/formatCalendarEvent";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
import prisma from "@calcom/prisma";
import type { CalendarEventsToSync } from "@calcom/types/Calendar";
import type {
  Calendar,
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";
import type { SelectedCalendarEventTypeIds, CalendarSubscription } from "@calcom/types/Calendar";
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
        email: hostExternalCalendarId ?? selectedHostDestinationCalendar?.externalId ?? event.organizer.email,
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
    calEventRaw: CalendarEvent,
    credentialId: number,
    externalCalendarId?: string
  ): Promise<NewCalendarEventType> {
    this.log.debug("Creating event");
    const formattedCalEvent = formatCalEvent(calEventRaw);

    const payload: calendar_v3.Schema$Event = {
      summary: formattedCalEvent.title,
      description: getRichDescription(formattedCalEvent),
      start: {
        dateTime: formattedCalEvent.startTime,
        timeZone: formattedCalEvent.organizer.timeZone,
      },
      end: {
        dateTime: formattedCalEvent.endTime,
        timeZone: formattedCalEvent.organizer.timeZone,
      },
      attendees: this.getAttendees({ event: formattedCalEvent, hostExternalCalendarId: externalCalendarId }),
      reminders: {
        useDefault: true,
      },
      guestsCanSeeOtherGuests: !!formattedCalEvent.seatsPerTimeSlot
        ? formattedCalEvent.seatsShowAttendees
        : true,
      iCalUID: formattedCalEvent.iCalUID,
    };
    if (calEventRaw.hideCalendarEventDetails) {
      payload.visibility = "private";
    }

    if (formattedCalEvent.location) {
      payload["location"] = getLocation(formattedCalEvent);
    }

    if (formattedCalEvent.recurringEvent) {
      const rule = new RRule({
        freq: formattedCalEvent.recurringEvent.freq,
        interval: formattedCalEvent.recurringEvent.interval,
        count: formattedCalEvent.recurringEvent.count,
      });

      payload["recurrence"] = [rule.toString()];
    }

    if (formattedCalEvent.conferenceData && formattedCalEvent.location === MeetLocationType) {
      payload["conferenceData"] = formattedCalEvent.conferenceData;
    }
    const calendar = await this.authedCalendar();
    // Find in formattedCalEvent.destinationCalendar the one with the same credentialId
    const chosenDestinationCalendar =
      externalCalendarId ??
      formattedCalEvent.destinationCalendar?.find((cal) => cal.credentialId === credentialId)?.externalId;

    if (!chosenDestinationCalendar) {
      logger.info(
        `No destination calendar found for event - Using "primary" calendar as fallback`,
        safeStringify({ externalCalendarId, credentialId })
      );
    }
    // "primary" is not an actualy calendarId, but it is accepted by Google Calendar API
    const calendarId = chosenDestinationCalendar || "primary";

    try {
      let event: calendar_v3.Schema$Event | undefined;
      let recurringEventId = null;
      if (formattedCalEvent.existingRecurringEvent) {
        recurringEventId = formattedCalEvent.existingRecurringEvent.recurringEventId;
        const recurringEventInstances = await calendar.events.instances({
          calendarId,
          eventId: formattedCalEvent.existingRecurringEvent.recurringEventId,
        });
        if (recurringEventInstances.data.items) {
          const calComEventStartTime = dayjs(formattedCalEvent.startTime)
            .tz(formattedCalEvent.organizer.timeZone)
            .format();
          for (let i = 0; i < recurringEventInstances.data.items.length; i++) {
            const instance = recurringEventInstances.data.items[i];
            const instanceStartTime = dayjs(instance.start?.dateTime)
              .tz(instance.start?.timeZone == null ? undefined : instance.start?.timeZone)
              .format();

            if (instanceStartTime === calComEventStartTime) {
              event = instance;
              break;
            }
          }

          if (!event) {
            event = recurringEventInstances.data.items[0];
            this.log.error(
              "Unable to find matching event amongst recurring event instances",
              safeStringify({ selectedCalendar: chosenDestinationCalendar, credentialId })
            );
          }
          await calendar.events.patch({
            calendarId,
            eventId: event.id || "",
            requestBody: {
              location: getLocation(formattedCalEvent),
              description: getRichDescription({
                ...formattedCalEvent,
              }),
            },
          });
        }
      } else {
        const eventResponse = await calendar.events.insert({
          calendarId,
          requestBody: payload,
          conferenceDataVersion: 1,
          sendUpdates: "none",
        });
        event = eventResponse.data;
        if (event.recurrence) {
          if (event.recurrence.length > 0) {
            recurringEventId = event.id;
            event = await this.getFirstEventInRecurrence(recurringEventId, calendarId, calendar);
          }
        }
      }

      if (event && event.id && event.hangoutLink) {
        await calendar.events.patch({
          // Update the same event but this time we know the hangout link
          calendarId,
          eventId: event.id || "",
          requestBody: {
            description: getRichDescription({
              ...formattedCalEvent,
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
        usedExternalCalendarId: chosenDestinationCalendar,
      };
    } catch (error) {
      if (isGaxiosResponse(error)) {
        // Prevent clogging up the logs with the body of the request
        // Plus, we already have this data in error.data.summary
        delete error.config.body;
      }
      this.log.error(
        "There was an error creating event in google calendar: ",
        safeStringify({ error, selectedCalendar: chosenDestinationCalendar, credentialId })
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

  async updateEvent(uid: string, event: CalendarEvent, externalCalendarId: string): Promise<any> {
    const formattedCalEvent = formatCalEvent(event);

    const payload: calendar_v3.Schema$Event = {
      summary: formattedCalEvent.title,
      description: getRichDescription(formattedCalEvent),
      start: {
        dateTime: formattedCalEvent.startTime,
        timeZone: formattedCalEvent.organizer.timeZone,
      },
      end: {
        dateTime: formattedCalEvent.endTime,
        timeZone: formattedCalEvent.organizer.timeZone,
      },
      attendees: this.getAttendees({ event: formattedCalEvent, hostExternalCalendarId: externalCalendarId }),
      reminders: {
        useDefault: true,
      },
      guestsCanSeeOtherGuests: !!formattedCalEvent.seatsPerTimeSlot
        ? formattedCalEvent.seatsShowAttendees
        : true,
    };

    if (formattedCalEvent.location) {
      payload["location"] = getLocation(formattedCalEvent);
    }

    if (formattedCalEvent.conferenceData && formattedCalEvent.location === MeetLocationType) {
      payload["conferenceData"] = formattedCalEvent.conferenceData;
    }

    const calendar = await this.authedCalendar();
    const chosenDestinationCalendar = externalCalendarId
      ? formattedCalEvent.destinationCalendar?.find((cal) => cal.externalId === externalCalendarId)
          ?.externalId
      : undefined;
    if (!chosenDestinationCalendar) {
      logger.info(
        `No destination calendar found for event - Using "primary" calendar as fallback`,
        safeStringify({ externalCalendarId })
      );
    }
    const calendarId = chosenDestinationCalendar || "primary";

    try {
      const evt = await calendar.events.update({
        calendarId,
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
          calendarId,
          eventId: evt.data.id || "",
          requestBody: {
            description: getRichDescription({
              ...formattedCalEvent,
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
          usedExternalCalendarId: chosenDestinationCalendar,
        };
      }
      if (!evt?.data) {
        return evt?.data;
      }

      return {
        ...evt.data,
        usedExternalCalendarId: chosenDestinationCalendar,
      };
    } catch (error) {
      this.log.error(
        "There was an error updating event in google calendar: ",
        safeStringify({ error, event: formattedCalEvent, uid })
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

  private async getCalIdsWithTimeZone({
    selectedCalendarIds,
    fallbackToPrimary,
  }: {
    selectedCalendarIds: string[];
    fallbackToPrimary: boolean;
  }) {
    const calendar = await this.authedCalendar();
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
    const selectedCalendarIds = selectedCalendars
      .filter((e) => e.integration === this.integrationName)
      .map((e) => e.externalId);
    if (selectedCalendarIds.length === 0 && selectedCalendars.length > 0) {
      // Only calendars of other integrations selected
      return [];
    }

    try {
      const freeBusyData = await this.getCacheOrFetchAvailability({
        timeMin: dateFrom,
        timeMax: dateTo,
        items: selectedCalendarIds.map((id) => ({ id })),
      });
      if (!freeBusyData) throw new Error("No response from google calendar");
      // FIXME: This will trigger a request to google api even if we have cached data
      // Find a way to get the timeZone from the cached data
      const calIdsWithTimeZone = await this.getCalIdsWithTimeZone({
        selectedCalendarIds,
        fallbackToPrimary: !!fallbackToPrimary,
      });
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
    const calendar = await this.authedCalendar();
    const selectedCalendarIds = selectedCalendars
      .filter((e) => e.integration === this.integrationName)
      .map((e) => e.externalId);
    if (selectedCalendarIds.length === 0 && selectedCalendars.length > 0) {
      // Only calendars of other integrations selected
      return [];
    }
    const getCalIds = async () => {
      if (selectedCalendarIds.length !== 0) return selectedCalendarIds;
      const cals = await this.getAllCalendars(calendar, ["id", "primary"]);
      if (!cals.length) return [];
      if (!fallbackToPrimary) return this.getValidCalendars(cals).map((cal) => cal.id);

      const primaryCalendar = this.filterPrimaryCalendar(cals);
      if (!primaryCalendar) return [];
      return [primaryCalendar.id];
    };

    try {
      const calsIds = await getCalIds();
      const originalStartDate = dayjs(dateFrom);
      const originalEndDate = dayjs(dateTo);
      const diff = originalEndDate.diff(originalStartDate, "days");

      // /freebusy from google api only allows a date range of 90 days
      if (diff <= 90) {
        const freeBusyData = await this.getCacheOrFetchAvailability(
          {
            timeMin: dateFrom,
            timeMax: dateTo,
            items: calsIds.map((id) => ({ id })),
          },
          shouldServeCache
        );
        if (!freeBusyData) throw new Error("No response from google calendar");

        return freeBusyData.map((freeBusy) => ({ start: freeBusy.start, end: freeBusy.end }));
      } else {
        const busyData = [];

        const loopsNumber = Math.ceil(diff / 90);

        let startDate = originalStartDate;
        let endDate = originalStartDate.add(90, "days");

        for (let i = 0; i < loopsNumber; i++) {
          if (endDate.isAfter(originalEndDate)) endDate = originalEndDate;

          busyData.push(
            ...((await this.getCacheOrFetchAvailability(
              {
                timeMin: startDate.format(),
                timeMax: endDate.format(),
                items: calsIds.map((id) => ({ id })),
              },
              shouldServeCache
            )) || [])
          );

          startDate = endDate.add(1, "minutes");
          endDate = startDate.add(90, "days");
        }
        return busyData.map((freeBusy) => ({ start: freeBusy.start, end: freeBusy.end }));
      }
    } catch (error) {
      this.log.error(
        "There was an error getting availability from google calendar: ",
        safeStringify({ error, selectedCalendars })
      );
      throw error;
    }
  }

  /**
   * Better alternative to `getPrimaryCalendar` that doesn't require any argument
   */
  async fetchPrimaryCalendar() {
    const calendar = await this.authedCalendar();
    const primaryCalendar = await this.getPrimaryCalendar(calendar);
    return primaryCalendar;
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

  async onWatchedCalendarChange({
    calendarId,
    syncActions,
  }: {
    calendarId: string;
    syncActions: ("availability-cache" | "events-sync")[];
  }) {
    log.debug("onWatchedCalendarChange", safeStringify({ calendarId, syncActions }));

    const [calendarCachePromiseResult, eventsToSyncPromiseResult] = await Promise.allSettled([
      syncActions.includes("availability-cache")
        ? this.fetchSelectedCalendarsAvailabilityAndSetCache()
        : null,
      syncActions.includes("events-sync") ? this.getEventsThatShouldBeSyncedDownstream(calendarId) : [],
    ]);

    const calendarCacheError =
      calendarCachePromiseResult.status === "rejected" ? calendarCachePromiseResult.reason : null;

    const eventsToSyncError =
      eventsToSyncPromiseResult.status === "rejected" ? eventsToSyncPromiseResult.reason : null;
    const eventsToSyncResult =
      eventsToSyncPromiseResult.status === "fulfilled" ? eventsToSyncPromiseResult.value : null;

    if (calendarCacheError) {
      log.error("calendarCacheResult", safeStringify(calendarCacheError));
    }

    if (eventsToSyncError) {
      log.error("eventsToSyncResult", safeStringify(eventsToSyncError));
    }

    return {
      eventsToSync: eventsToSyncResult || [],
    };
  }

  private async fetchSelectedCalendarsAvailabilityAndSetCache() {
    const selectedCalendars = await SelectedCalendarRepository.findFromCredentialId(this.credential.id);
    await this.fetchAvailabilityAndSetCache(selectedCalendars);
  }

  private async listRecentlyUpdatedEvents({
    calendarId,
    updatedMin,
    includeDeleted,
    maxResults,
  }: {
    calendarId: string;
    updatedMin: string;
    includeDeleted: boolean;
    maxResults: number;
  }) {
    try {
      const calendar = await this.authedCalendar();
      const events = await calendar.events.list({
        calendarId,
        maxResults,
        orderBy: "updated", // Get the most recently updated events
        showDeleted: includeDeleted,
        // singleEvents: false, // Set to false if dealing with recurring events potentially
        updatedMin,
      });

      log.debug(
        "Recently updated events list:",
        safeStringify({
          count: events.data.items?.length,
          itemsSummary: events.data.items?.map((item) => ({
            id: item.id,
            status: item.status,
            updated: item.updated,
            summary: item.summary,
            start: item.start,
            end: item.end,
            attendees: item.attendees?.map((attendee) => ({
              email: attendee.email,
              responseStatus: attendee.responseStatus,
            })),
          })),
        })
      );

      return events.data.items || [];
    } catch (error) {
      log.error("Error fetching events", safeStringify(error));
      throw error;
    }
  }

  private async getEventsThatShouldBeSyncedDownstream(calendarId: string) {
    log.debug("getEventsThatShouldBeSyncedDownstream", safeStringify({ calendarId }));
    const timeMin = dayjs().subtract(1, "hour").toISOString(); // Look back 1 hour
    const recentlyUpdatedEvents = await this.listRecentlyUpdatedEvents({
      calendarId,
      updatedMin: timeMin,
      // We want cancelled events too
      includeDeleted: true,
      maxResults: 10,
    });
    const concernedEvents = recentlyUpdatedEvents.map((event) => {
      // Find the organizer in attendees
      const organizer = event.attendees?.find((attendee) => attendee.organizer === true);
      return {
        id: event.id,
        status: event.status,
        // startTime and endTime need to be correctly interpreted in timezone, so for now even though they are sent, we don't update Booking start time and end time
        startTime: event.start?.dateTime ? dayjs(event.start.dateTime) : null,
        endTime: event.end?.dateTime ? dayjs(event.end.dateTime) : null,
        organizerResponseStatus: organizer?.responseStatus || null,
      };
    });

    log.debug("concernedEvents", safeStringify(concernedEvents));

    return concernedEvents.filter((e): e is CalendarEventsToSync[number] => e !== null);
  }

  // It would error if the delegation credential is not set up correctly
  async testDelegationCredentialSetup() {
    log.debug("Testing delegation credential setup");
    const calendar = await this.authedCalendar();
    const cals = await calendar.calendarList.list({ fields: "items(id)" });
    return !!cals.data.items;
  }

  async subscribeToCalendar({ calendarId }: { calendarId: string }) {
    log.debug("subscribeToCalendar", safeStringify({ calendarId }));
    if (!process.env.GOOGLE_WEBHOOK_TOKEN) {
      throw new Error("GOOGLE_WEBHOOK_TOKEN is not set");
    }

    try {
      const watchResponse = await this.startWatchingCalendarsInGoogle({ calendarId });
      return {
        id: watchResponse.id ?? null,
        kind: watchResponse.kind ?? null,
        resourceId: watchResponse.resourceId ?? null,
        resourceUri: watchResponse.resourceUri ?? null,
        expiration: watchResponse.expiration ?? null,
      };
    } catch (error) {
      this.log.error(`Failed to subscribe to calendar ${calendarId}`, error);
      throw error;
    }
  }

  async unsubscribeFromCalendar({
    providerSubscriptionId,
    providerResourceId,
  }: {
    providerSubscriptionId: string;
    providerResourceId: string;
  }) {
    log.debug("unsubscribeFromCalendar", safeStringify({ providerSubscriptionId, providerResourceId }));

    try {
      return await this.stopWatchingCalendarsInGoogle([
        { googleChannelId: providerSubscriptionId, googleChannelResourceId: providerResourceId },
      ]);
    } catch (error) {
      this.log.error(`Failed to unsubscribe from calendar ${providerSubscriptionId}`, error);
      throw error;
    }
  }

  /**
   * TODO: Rename it to watchCalendarForFreeBusy
   *
   * calendarId is the externalId for the SelectedCalendar
   * It doesn't check if the subscription has expired or not.
   * It just creates a new subscription.
   */
  async watchCalendar({
    calendarId,
    eventTypeIds,
    calendarSubscription,
  }: {
    calendarId: string;
    eventTypeIds: SelectedCalendarEventTypeIds;
    calendarSubscription: CalendarSubscription;
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

    // Fill in googleChannelProps from either an existing subscription or selected calendar
    let googleChannelProps: GoogleChannelProps = {};
    let shouldCreateNewSubscription = true;
    if (calendarSubscription) {
      // Use CalendarSubscription data
      googleChannelProps = {
        id: calendarSubscription.providerSubscriptionId,
        kind: calendarSubscription.providerSubscriptionKind,
        resourceId: calendarSubscription.providerResourceId,
        resourceUri: calendarSubscription.providerResourceUri,
        expiration: calendarSubscription.providerExpiration?.toISOString() ?? null,
      };
      shouldCreateNewSubscription = false;
      logger.info(
        `Calendar ${calendarId} is already being watched via CalendarSubscription. Reusing existing channel.`,
        safeStringify({
          calendarSubscriptionId: calendarSubscription?.id,
        })
      );
    } else if (otherCalendarsWithSameSubscription.length > 0) {
      // Use SelectedCalendar data
      googleChannelProps = {
        kind: otherCalendarsWithSameSubscription[0].googleChannelKind,
        id: otherCalendarsWithSameSubscription[0].googleChannelId,
        resourceId: otherCalendarsWithSameSubscription[0].googleChannelResourceId,
        resourceUri: otherCalendarsWithSameSubscription[0].googleChannelResourceUri,
        expiration: otherCalendarsWithSameSubscription[0].googleChannelExpiration,
      };
      shouldCreateNewSubscription = false;
      logger.info(
        `Calendar ${calendarId} is already being watched via otherSelectedCalendars. Reusing existing channel.`,
        safeStringify({
          otherCalendarsWithSameSubscription: otherCalendarsWithSameSubscription.map((sc) => sc.id),
        })
      );
    }

    // Only create a new subscription if none exists
    if (shouldCreateNewSubscription) {
      try {
        googleChannelProps = await this.subscribeToCalendar({ calendarId });
      } catch (error) {
        this.log.error(`Failed to watch calendar ${calendarId}`, safeStringify(error));
        throw error;
      }
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
   * Handler for associating event types with a channel response
   */
  async handleWatchEventTypeAssociation({
    calendarId,
    eventTypeIds,
    watchResponse,
  }: {
    calendarId: string;
    eventTypeIds: SelectedCalendarEventTypeIds;
    watchResponse: GoogleChannelProps;
  }) {
    await this.upsertSelectedCalendarsForEventTypeIds(
      {
        externalId: calendarId,
        googleChannelId: watchResponse?.id,
        googleChannelKind: watchResponse?.kind,
        googleChannelResourceId: watchResponse?.resourceId,
        googleChannelResourceUri: watchResponse?.resourceUri,
        googleChannelExpiration: watchResponse?.expiration,
      },
      eventTypeIds
    );
    return watchResponse;
  }

  /**
   * TODO: Rename it to unwatchCalendarForFreeBusy
   * GoogleChannel subscription is only stopped when all selectedCalendars are un-watched.
   */
  async unwatchCalendar({
    calendarId,
    eventTypeIds,
    calendarSubscription,
  }: {
    calendarId: string;
    eventTypeIds: SelectedCalendarEventTypeIds;
    calendarSubscription: CalendarSubscription;
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

    // Find which ones will still be watched after this unwatching operation
    const calendarsWithSameExternalIdToBeStillWatched = calendarsWithSameExternalIdThatAreBeingWatched.filter(
      (sc) => !eventTypeIdsToBeUnwatched.includes(sc.eventTypeId)
    );

    // If there are other calendars still using this subscription, don't unwatch
    if (calendarsWithSameExternalIdToBeStillWatched.length || calendarSubscription) {
      logger.info(
        `There are other ${calendarsWithSameExternalIdToBeStillWatched.length} SelectedCalendars or CalendarSubscription record with the same externalId_credentialId. Not unwatching. Just removing the channelId from this selected calendar`,
        safeStringify({
          calendarsWithSameExternalIdToBeStillWatched,
          calendarSubscriptionId: calendarSubscription?.id,
        })
      );

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

  async getPrimaryCalendar(
    calendar: calendar_v3.Calendar,
    fields: string[] = ["id", "summary", "primary", "accessRole"]
  ): Promise<calendar_v3.Schema$CalendarListEntry | null> {
    let pageToken: string | undefined;
    let firstCalendar: calendar_v3.Schema$CalendarListEntry | undefined;

    try {
      do {
        const response: any = await calendar.calendarList.list({
          fields: `items(${fields.join(",")}),nextPageToken`,
          pageToken,
          maxResults: 250, // 250 is max
        });

        const cals = response.data.items ?? [];
        const primaryCal = cals.find((cal: calendar_v3.Schema$CalendarListEntry) => cal.primary);
        if (primaryCal) {
          return primaryCal;
        }

        // Store the first calendar in case no primary is found
        if (cals.length > 0 && !firstCalendar) {
          firstCalendar = cals[0];
        }

        pageToken = response.data.nextPageToken;
      } while (pageToken);

      // should not be reached because Google Cal always has a primary cal
      return firstCalendar ?? null;
    } catch (error) {
      logger.error("Error in `getPrimaryCalendar`", { error });
      throw error;
    }
  }
}
