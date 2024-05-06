/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Prisma } from "@prisma/client";
import type { calendar_v3 } from "googleapis";
import { google } from "googleapis";
import { RRule } from "rrule";

import { MeetLocationType } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
import { getFeatureFlag } from "@calcom/features/flags/server/utils";
import { getLocation, getRichDescription } from "@calcom/lib/CalEventParser";
import type CalendarService from "@calcom/lib/CalendarService";
import {
  APP_CREDENTIAL_SHARING_ENABLED,
  CREDENTIAL_SYNC_ENDPOINT,
  CREDENTIAL_SYNC_SECRET,
  CREDENTIAL_SYNC_SECRET_HEADER_NAME,
} from "@calcom/lib/constants";
import { formatCalEvent } from "@calcom/lib/formatCalendarEvent";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import type {
  Calendar,
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";
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

const ONE_MINUTE_MS = 60 * 1000;
const CACHING_TIME = ONE_MINUTE_MS;

/** Expand the start date to the start of the month */
function getTimeMin(timeMin: string) {
  const dateMin = new Date(timeMin);
  return new Date(dateMin.getFullYear(), dateMin.getMonth(), 1, 0, 0, 0, 0).toISOString();
}

/** Expand the end date to the end of the month */
function getTimeMax(timeMax: string) {
  const dateMax = new Date(timeMax);
  return new Date(dateMax.getFullYear(), dateMax.getMonth() + 1, 0, 0, 0, 0, 0).toISOString();
}

/**
 * Enable or disable the expanded cache
 * TODO: Make this configurable
 * */
const ENABLE_EXPANDED_CACHE = true;

/**
 * By expanding the cache to whole months, we can save round trips to the third party APIs.
 * In this case we already have the data in the database, so we can just return it.
 */
function handleMinMax(min: string, max: string) {
  if (!ENABLE_EXPANDED_CACHE) return { timeMin: min, timeMax: max };
  return { timeMin: getTimeMin(min), timeMax: getTimeMax(max) };
}

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
    const calendar = google.calendar({
      version: "v3",
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
      let event;
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

    const selectedCalendar =
      (externalCalendarId
        ? event.destinationCalendar?.find((cal) => cal.externalId === externalCalendarId)?.externalId
        : undefined) || "primary";

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

  async getCacheOrFetchAvailability(args: {
    timeMin: string;
    timeMax: string;
    items: { id: string }[];
  }): Promise<EventBusyDate[] | null> {
    const calendar = await this.authedCalendar();
    const calendarCacheEnabled = await getFeatureFlag(prisma, "calendar-cache");

    let freeBusyResult: calendar_v3.Schema$FreeBusyResponse = {};
    if (!calendarCacheEnabled) {
      this.log.warn("Calendar Cache is disabled - Skipping");
      const { timeMin, timeMax, items } = args;
      ({ json: freeBusyResult } = await this.oAuthManagerInstance.request(
        async () =>
          new AxiosLikeResponseToFetchResponse(
            await calendar.freebusy.query({
              requestBody: { timeMin, timeMax, items },
            })
          )
      ));
    } else {
      const { timeMin: _timeMin, timeMax: _timeMax, items } = args;
      const { timeMin, timeMax } = handleMinMax(_timeMin, _timeMax);
      const key = JSON.stringify({ timeMin, timeMax, items });
      const cached = await prisma.calendarCache.findUnique({
        where: {
          credentialId_key: {
            credentialId: this.credential.id,
            key,
          },
          expiresAt: { gte: new Date(Date.now()) },
        },
      });

      if (cached) {
        freeBusyResult = cached.value as unknown as calendar_v3.Schema$FreeBusyResponse;
      } else {
        ({ json: freeBusyResult } = await this.oAuthManagerInstance.request(
          async () =>
            new AxiosLikeResponseToFetchResponse(
              await calendar.freebusy.query({
                requestBody: { timeMin, timeMax, items },
              })
            )
        ));

        // Skipping await to respond faster
        await prisma.calendarCache.upsert({
          where: {
            credentialId_key: {
              credentialId: this.credential.id,
              key,
            },
          },
          update: {
            value: JSON.parse(JSON.stringify(freeBusyResult)),
            expiresAt: new Date(Date.now() + CACHING_TIME),
          },
          create: {
            value: JSON.parse(JSON.stringify(freeBusyResult)),
            credentialId: this.credential.id,
            key,
            expiresAt: new Date(Date.now() + CACHING_TIME),
          },
        });
      }
    }
    if (!freeBusyResult.calendars) return null;

    const result = Object.values(freeBusyResult.calendars).reduce((c, i) => {
      i.busy?.forEach((busyTime) => {
        c.push({
          start: busyTime.start || "",
          end: busyTime.end || "",
        });
      });
      return c;
    }, [] as Prisma.PromiseReturnType<CalendarService["getAvailability"]>);
    return result;
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
  ): Promise<EventBusyDate[]> {
    this.log.debug("Getting availability");
    const calendar = await this.authedCalendar();
    const selectedCalendarIds = selectedCalendars
      .filter((e) => e.integration === this.integrationName)
      .map((e) => e.externalId);
    if (selectedCalendarIds.length === 0 && selectedCalendars.length > 0) {
      // Only calendars of other integrations selected
      return [];
    }
    async function getCalIds() {
      if (selectedCalendarIds.length !== 0) return selectedCalendarIds;
      const cals = await calendar.calendarList.list({ fields: "items(id)" });
      if (!cals.data.items) return [];
      return cals.data.items.reduce((c, cal) => (cal.id ? [...c, cal.id] : c), [] as string[]);
    }

    try {
      const calsIds = await getCalIds();
      const originalStartDate = dayjs(dateFrom);
      const originalEndDate = dayjs(dateTo);
      const diff = originalEndDate.diff(originalStartDate, "days");

      // /freebusy from google api only allows a date range of 90 days
      if (diff <= 90) {
        const freeBusyData = await this.getCacheOrFetchAvailability({
          timeMin: dateFrom,
          timeMax: dateTo,
          items: calsIds.map((id) => ({ id })),
        });
        if (!freeBusyData) throw new Error("No response from google calendar");

        return freeBusyData;
      } else {
        const busyData = [];

        const loopsNumber = Math.ceil(diff / 90);

        let startDate = originalStartDate;
        let endDate = originalStartDate.add(90, "days");

        for (let i = 0; i < loopsNumber; i++) {
          if (endDate.isAfter(originalEndDate)) endDate = originalEndDate;

          busyData.push(
            ...((await this.getCacheOrFetchAvailability({
              timeMin: startDate.format(),
              timeMax: endDate.format(),
              items: calsIds.map((id) => ({ id })),
            })) || [])
          );

          startDate = endDate.add(1, "minutes");
          endDate = startDate.add(90, "days");
        }
        return busyData;
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
          new AxiosLikeResponseToFetchResponse(
            await calendar.calendarList.list({ fields: "items(id,summary,primary,accessRole)" })
          )
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
}

class MyGoogleAuth extends google.auth.OAuth2 {
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
