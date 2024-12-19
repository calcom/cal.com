/* eslint-disable @typescript-eslint/no-explicit-any */
import { calendar_v3 } from "@googleapis/calendar";
import type { Prisma } from "@prisma/client";
import type { GaxiosResponse } from "googleapis-common";
import { OAuth2Client } from "googleapis-common";
import { RRule } from "rrule";
import { v4 as uuid } from "uuid";

import { MeetLocationType } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
import { CalendarCache } from "@calcom/features/calendar-cache/calendar-cache";
import type { FreeBusyArgs } from "@calcom/features/calendar-cache/calendar-cache.repository.interface";
import { getTimeMax, getTimeMin } from "@calcom/features/calendar-cache/lib/datesForCache";
import { getLocation, getRichDescription } from "@calcom/lib/CalEventParser";
import { uniqueBy } from "@calcom/lib/array";
import {
  APP_CREDENTIAL_SHARING_ENABLED,
  CREDENTIAL_SYNC_ENDPOINT,
  CREDENTIAL_SYNC_SECRET,
  CREDENTIAL_SYNC_SECRET_HEADER_NAME,
} from "@calcom/lib/constants";
import { formatCalEvent } from "@calcom/lib/formatCalendarEvent";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
import prisma from "@calcom/prisma";
import type {
  Calendar,
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";
import type { SelectedCalendarEventTypeIds } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import { invalidateCredential } from "../../_utils/invalidateCredential";
import { AxiosLikeResponseToFetchResponse } from "../../_utils/oauth/AxiosLikeResponseToFetchResponse";
import { OAuthManager } from "../../_utils/oauth/OAuthManager";
import { getTokenObjectFromCredential } from "../../_utils/oauth/getTokenObjectFromCredential";
import { markTokenAsExpired } from "../../_utils/oauth/markTokenAsExpired";
import { OAuth2UniversalSchema } from "../../_utils/oauth/universalSchema";
import { metadata } from "../_metadata";
import { getGoogleAppKeys } from "./getGoogleAppKeys";

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
  private auth: ReturnType<typeof this.initGoogleAuth>;
  private log: typeof logger;
  private credential: CredentialPayload;
  private myGoogleAuth!: MyGoogleAuth;
  private oAuthManagerInstance!: OAuthManager;
  constructor(credential: CredentialPayload) {
    this.integrationName = "google_calendar";
    this.credential = credential;
    this.auth = this.initGoogleAuth(credential);
    this.log = log.getSubLogger({ prefix: [`[[lib] ${this.integrationName}`] });
  }

  private async getMyGoogleAuthSingleton() {
    if (this.myGoogleAuth) {
      return this.myGoogleAuth;
    }
    const { client_id, client_secret, redirect_uris } = await getGoogleAppKeys();
    const googleCredentials = OAuth2UniversalSchema.parse(this.credential.key);
    this.myGoogleAuth = new MyGoogleAuth(client_id, client_secret, redirect_uris[0]);
    this.myGoogleAuth.setCredentials(googleCredentials);
    return this.myGoogleAuth;
  }

  private initGoogleAuth = (credential: CredentialPayload) => {
    const currentTokenObject = getTokenObjectFromCredential(credential);
    const auth = new OAuthManager({
      // Keep it false because we are not using auth.request everywhere. That would be done later as it involves many google calendar sdk functionc calls and needs to be tested well.
      autoCheckTokenExpiryOnRequest: false,
      credentialSyncVariables: {
        APP_CREDENTIAL_SHARING_ENABLED: APP_CREDENTIAL_SHARING_ENABLED,
        CREDENTIAL_SYNC_ENDPOINT: CREDENTIAL_SYNC_ENDPOINT,
        CREDENTIAL_SYNC_SECRET: CREDENTIAL_SYNC_SECRET,
        CREDENTIAL_SYNC_SECRET_HEADER_NAME: CREDENTIAL_SYNC_SECRET_HEADER_NAME,
      },
      resourceOwner: {
        type: "user",
        id: credential.userId,
      },
      appSlug: metadata.slug,
      currentTokenObject,
      fetchNewTokenObject: async ({ refreshToken }: { refreshToken: string | null }) => {
        const myGoogleAuth = await this.getMyGoogleAuthSingleton();
        const fetchTokens = await myGoogleAuth.refreshToken(refreshToken);
        // Create Response from fetchToken.res
        const response = new Response(JSON.stringify(fetchTokens.res?.data ?? null), {
          status: fetchTokens.res?.status,
          statusText: fetchTokens.res?.statusText,
        });
        return response;
      },
      isTokenExpired: async () => {
        const myGoogleAuth = await this.getMyGoogleAuthSingleton();
        return myGoogleAuth.isTokenExpiring();
      },
      isTokenObjectUnusable: async function (response) {
        // TODO: Confirm that if this logic should go to isAccessTokenUnusable
        if (!response.ok || (response.status < 200 && response.status >= 300)) {
          const responseBody = await response.json();

          if (responseBody.error === "invalid_grant") {
            return {
              reason: "invalid_grant",
            };
          }
        }
        return null;
      },
      isAccessTokenUnusable: async () => {
        // As long as refresh_token is valid, access_token is regenerated and fixed automatically by Google Calendar when a problem with it is detected
        // So, a situation where access_token is invalid but refresh_token is valid should not happen
        return null;
      },
      invalidateTokenObject: () => invalidateCredential(this.credential.id),
      expireAccessToken: async () => {
        await markTokenAsExpired(this.credential);
      },
      updateTokenObject: async (token) => {
        this.myGoogleAuth.setCredentials(token);

        const { key } = await prisma.credential.update({
          where: {
            id: credential.id,
          },
          data: {
            key: token,
          },
        });

        // Update cached credential as well
        this.credential.key = key;
      },
    });
    this.oAuthManagerInstance = auth;
    return {
      getMyGoogleAuthWithRefreshedToken: async () => {
        // It would automatically update myGoogleAuth with correct token
        const { token } = await auth.getTokenObjectOrFetch();
        if (!token) {
          throw new Error("Invalid grant for Google Calendar app");
        }

        const myGoogleAuth = await this.getMyGoogleAuthSingleton();
        return myGoogleAuth;
      },
    };
  };

  public authedCalendar = async () => {
    const myGoogleAuth = await this.auth.getMyGoogleAuthWithRefreshedToken();
    const calendar = new calendar_v3.Calendar({
      auth: myGoogleAuth,
    });
    return calendar;
  };

  private getAttendees = (event: CalendarEvent) => {
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
        email: selectedHostDestinationCalendar?.externalId ?? event.organizer.email,
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
    logger.debug(`Subscribing to calendar ${calendarId}`);

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

  async createEvent(calEventRaw: CalendarEvent, credentialId: number): Promise<NewCalendarEventType> {
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
      attendees: this.getAttendees(formattedCalEvent),
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

    const selectedCalendar =
      formattedCalEvent.destinationCalendar?.find((cal) => cal.credentialId === credentialId)?.externalId ||
      "primary";

    try {
      let event: calendar_v3.Schema$Event | undefined;
      let recurringEventId = null;
      if (formattedCalEvent.existingRecurringEvent) {
        recurringEventId = formattedCalEvent.existingRecurringEvent.recurringEventId;
        const recurringEventInstances = await calendar.events.instances({
          calendarId: selectedCalendar,
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
              safeStringify({ selectedCalendar, credentialId })
            );
          }
          await calendar.events.patch({
            calendarId: selectedCalendar,
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
      attendees: this.getAttendees(formattedCalEvent),
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

    const selectedCalendar =
      (externalCalendarId
        ? formattedCalEvent.destinationCalendar?.find((cal) => cal.externalId === externalCalendarId)
            ?.externalId
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
        };
      }
      return evt?.data;
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
    const calendar = await this.authedCalendar();
    const apiResponse = await this.oAuthManagerInstance.request(
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
    const cached = await calendarCache.getCachedAvailability(this.credential.id, args);
    if (cached) return cached.value as unknown as calendar_v3.Schema$FreeBusyResponse;
    return await this.fetchAvailability(args);
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
    selectedCalendars: IntegrationCalendar[]
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

      // we ever reach that code, we already check before if selectedCalendarIds is empty
      return [];
    };

    try {
      const calIdsWithTimeZone = await getCalIdsWithTimeZone();
      const calIds = calIdsWithTimeZone.map((calIdWithTimeZone) => ({ id: calIdWithTimeZone.id }));

      const originalStartDate = dayjs(dateFrom);
      const originalEndDate = dayjs(dateTo);
      const diff = originalEndDate.diff(originalStartDate, "days");
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

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[],
    shouldServeCache?: boolean
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
      const cals = await this.getAllCalendars(calendar, ["id"]);
      if (!cals.length) return [];
      return cals.reduce((c, cal) => (cal.id ? [...c, cal.id] : c), [] as string[]);
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

  async listCalendars(): Promise<IntegrationCalendar[]> {
    this.log.debug("Listing calendars");
    const calendar = await this.authedCalendar();
    try {
      const { json: cals } = await this.oAuthManagerInstance.request(
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

  /**
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
    let error: string | undefined;

    if (!otherCalendarsWithSameSubscription.length) {
      try {
        googleChannelProps = await this.startWatchingCalendarsInGoogle({ calendarId });
      } catch (error) {
        this.log.error(`Failed to watch calendar ${calendarId}`, error);
        // We set error to prevent attempting to watch on next cron run
        error = error instanceof Error ? error.message : "Unknown error";
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
        error,
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
      (sc) => sc.externalId === calendarId
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
      calendarsWithSameCredentialId.filter((sc) => sc.externalId !== calendarId) || [];
    if (remainingCalendars.length > 0) {
      await this.fetchAvailabilityAndSetCache(remainingCalendars);
    }
  }

  async setAvailabilityInCache(args: FreeBusyArgs, data: calendar_v3.Schema$FreeBusyResponse): Promise<void> {
    const calendarCache = await CalendarCache.init(null);
    await calendarCache.upsertCachedAvailability(this.credential.id, args, JSON.parse(JSON.stringify(data)));
  }

  async fetchAvailabilityAndSetCache(selectedCalendars: IntegrationCalendar[]) {
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
        /** Expand the start date to the start of the month */
        timeMin: getTimeMin(),
        /** Expand the end date to the end of the month */
        timeMax: getTimeMax(),
        // Dont use eventTypeId in key because it can be used by any eventType
        // The only reason we are building it per eventType is because there can be different groups of calendars to lookup the availablity for
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
    if (!this.credential.userId) {
      logger.error("upsertSelectedCalendarsForEventTypeIds failed. userId is missing.");
      return;
    }

    await SelectedCalendarRepository.upsertManyForEventTypeIds({
      data: {
        ...data,
        integration: this.integrationName,
        credentialId: this.credential.id,
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

class MyGoogleAuth extends OAuth2Client {
  constructor(client_id: string, client_secret: string, redirect_uri: string) {
    super(client_id, client_secret, redirect_uri);
  }

  isTokenExpiring() {
    return super.isTokenExpiring();
  }

  async refreshToken(token: string | null | undefined) {
    return super.refreshToken(token);
  }
}
