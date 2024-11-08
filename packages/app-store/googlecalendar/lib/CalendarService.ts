/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Prisma } from "@prisma/client";
import type { calendar_v3 } from "googleapis";
import { google } from "googleapis";
import { RRule } from "rrule";
import { v4 as uuid } from "uuid";

import { MeetLocationType } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { getLocation, getRichDescription } from "@calcom/lib/CalEventParser";
import type CalendarService from "@calcom/lib/CalendarService";
import {
  APP_CREDENTIAL_SHARING_ENABLED,
  CREDENTIAL_SYNC_ENDPOINT,
  CREDENTIAL_SYNC_SECRET,
  CREDENTIAL_SYNC_SECRET_HEADER_NAME,
} from "@calcom/lib/constants";
import { formatCalEvent } from "@calcom/lib/formatCalendarEvent";
import { getAllCalendars } from "@calcom/lib/google";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { GoogleRepository } from "@calcom/lib/server/repository/google";
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
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ONE_MONTH_IN_MS = 30 * MS_PER_DAY;

/** Expand the start date to the start of the month */
function getTimeMin(timeMin: string) {
  const date = new Date();
  const dateMonth = date.getMonth();
  const dateMin = new Date(timeMin);
  const dateMinMonth = dateMin.getMonth();
  // If we browser the next month, return the start of the previous month to guarantee a cache hit
  if (date.getFullYear() === dateMin.getFullYear() && dateMinMonth - dateMonth === 1) {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0).toISOString();
  }
  return new Date(dateMin.getFullYear(), dateMin.getMonth(), 1, 0, 0, 0, 0).toISOString();
}

/** Expand the end date to the end of the month */
function getTimeMax(timeMax: string): string {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const targetDate = new Date(timeMax);
  const targetMonth = targetDate.getMonth();
  const isSameYear = currentDate.getFullYear() === targetDate.getFullYear();
  const isNextTwoMonths = [1, 2].includes(targetMonth - currentMonth);
  if (isSameYear && isNextTwoMonths) {
    return formatDate(currentDate.getFullYear(), currentMonth + 2);
  }
  return formatDate(targetDate.getFullYear(), targetMonth);
}

function formatDate(year: number, month: number): string {
  return new Date(year, month, 1, 0, 0, 0, 0).toISOString();
}

function treatAsUTC(date: string | Date) {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() - result.getTimezoneOffset());
  return result;
}

function daysBetween(startDate: string | Date, endDate: string | Date) {
  return (treatAsUTC(endDate).getTime() - treatAsUTC(startDate).getTime()) / MS_PER_DAY;
}

function addDays(startDate: string | Date, numberOfDays = 90) {
  return new Date(treatAsUTC(startDate).getTime() + numberOfDays * MS_PER_DAY).toISOString();
}

/**
 * By expanding the cache to whole months, we can save round trips to the third party APIs.
 * In this case we already have the data in the database, so we can just return it.
 */
function handleMinMax(min: string, max: string) {
  const timeMin = getTimeMin(min);
  const timeMax = getTimeMax(max);
  /**
   * Prevents quering more that 90 days
   * @see https://github.com/calcom/cal.com/pull/11962
   */
  if (daysBetween(timeMin, timeMax) > 90) return { timeMin, timeMax: addDays(timeMin, 90) };
  return { timeMin, timeMax };
}

type FreeBusyArgs = { timeMin: string; timeMax: string; items: { id: string }[] };
/**
 * We need to parse the passed arguments in order to comply with some requirements:
 * 1. Items should be sorted in order to guarantee the cache key is always the same
 * 2. timeMin and timeMax should be expanded to maximize cache hits
 * 3. timeMin and timeMax should not be more than 90 days apart (handled in handleMinMax)
 */
function parseArgsForCache(args: FreeBusyArgs): FreeBusyArgs {
  // Sort items by id to make sure the cache key is always the same
  const items = args.items.sort((a, b) => (a.id > b.id ? 1 : -1));
  const { timeMin, timeMax } = handleMinMax(args.timeMin, args.timeMax);
  return { timeMin, timeMax, items };
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

  async getCacheOrFetchAvailability(args: FreeBusyArgs): Promise<calendar_v3.Schema$FreeBusyResponse> {
    const featureRepo = new FeaturesRepository();
    const isCalendarCacheEnabledGlobally = await featureRepo.checkIfFeatureIsEnabledGlobally(
      "calendar-cache"
    );
    const parsedArgs = parseArgsForCache(args);
    if (!isCalendarCacheEnabledGlobally) {
      this.log.warn("Calendar Cache is disabled - Skipping");
      return await this.fetchAvailability(parsedArgs);
    }
    const key = JSON.stringify(parsedArgs);
    const cached = await this.getAvailabilityFromCache(key);

    if (cached) return cached.value as unknown as calendar_v3.Schema$FreeBusyResponse;

    const data = await this.fetchAvailability(parsedArgs);
    await this.setAvailabilityInCache(key, data);
    return data;
  }

  async fetchAvailabilityAndSetCache(selectedCalendars: IntegrationCalendar[]) {
    const date = new Date();
    const parsedArgs = parseArgsForCache({
      timeMin: new Date().toISOString(),
      timeMax: new Date(date.getFullYear(), date.getMonth() + 2, 0, 0, 0, 0, 0).toISOString(),
      items: selectedCalendars.map((sc) => ({ id: sc.externalId })),
    });
    const data = await this.fetchAvailability(parsedArgs);
    const key = JSON.stringify(parsedArgs);
    await this.setAvailabilityInCache(key, data);
  }

  async fetchAvailability(requestBody: FreeBusyArgs): Promise<calendar_v3.Schema$FreeBusyResponse> {
    const calendar = await this.authedCalendar();
    const apires = await calendar.freebusy.query({ requestBody });
    return apires.data;
  }

  async getAvailabilityFromCache(key: string) {
    return await prisma.calendarCache.findUnique({
      where: {
        credentialId_key: {
          credentialId: this.credential.id,
          key,
        },
        expiresAt: { gte: new Date(Date.now()) },
      },
    });
  }

  async setAvailabilityInCache(key: string, data: calendar_v3.Schema$FreeBusyResponse): Promise<void> {
    await prisma.calendarCache.upsert({
      where: {
        credentialId_key: {
          credentialId: this.credential.id,
          key,
        },
      },
      update: {
        value: JSON.parse(JSON.stringify(data)),
        expiresAt: new Date(Date.now() + CACHING_TIME),
      },
      create: {
        value: JSON.parse(JSON.stringify(data)),
        credentialId: this.credential.id,
        key,
        expiresAt: new Date(Date.now() + ONE_MONTH_IN_MS),
      },
    });
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
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
    async function getCalIds() {
      if (selectedCalendarIds.length !== 0) return selectedCalendarIds;
      const cals = await getAllCalendars(calendar, ["id"]);
      if (!cals.length) return [];
      return cals.reduce((c, cal) => (cal.id ? [...c, cal.id] : c), [] as string[]);
    }

    try {
      const calsIds = await getCalIds();
      const freeBusyData = await this.getCacheOrFetchAvailability({
        timeMin: dateFrom,
        timeMax: dateTo,
        items: calsIds.map((id) => ({ id })),
      });
      if (!freeBusyData?.calendars) throw new Error("No response from google calendar");
      const result = Object.values(freeBusyData.calendars).reduce((c, i) => {
        i.busy?.forEach((busyTime) => {
          c.push({
            start: busyTime.start || "",
            end: busyTime.end || "",
          });
        });
        return c;
      }, [] as Prisma.PromiseReturnType<CalendarService["getAvailability"]>);
      return result;
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
              items: await getAllCalendars(calendar),
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

  async watchCalendar({ calendarId }: { calendarId: string }) {
    const calendar = await this.authedCalendar();
    await this.unwatchCalendar({ calendarId });
    const res = await calendar.events.watch({
      // Calendar identifier. To retrieve calendar IDs call the calendarList.list method. If you want to access the primary calendar of the currently logged in user, use the "primary" keyword.
      calendarId,
      requestBody: {
        // A UUID or similar unique string that identifies this channel.
        id: uuid(),
        type: "web_hook",
        // address: `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/integrations/googlecalendar/webhook`,
        address: `https://asepoz-ip-189-203-41-65.tunnelmole.net/api/integrations/googlecalendar/webhook`,
        token: process.env.CRON_API_KEY,
        params: {
          // The time-to-live in seconds for the notification channel. Default is 604800 seconds.
          ttl: `${Math.round(ONE_MONTH_IN_MS / 1000)}`,
        },
      },
    });
    const response = res.data;
    await GoogleRepository.upsertSelectedCalendar({
      userId: this.credential.userId!,
      externalId: calendarId,
      credentialId: this.credential.id,
      googleChannelId: response?.id,
      googleChannelKind: response?.kind,
      googleChannelResourceId: response?.resourceId,
      googleChannelResourceUri: response?.resourceUri,
      googleChannelExpiration: response?.expiration,
    });

    return res.data;
  }
  async unwatchCalendar({ calendarId }: { calendarId: string }) {
    const credentialId = this.credential.id;
    const sc = await prisma.selectedCalendar.findFirst({
      where: {
        credentialId,
        externalId: calendarId,
      },
    });
    // Delete the calendar cache to force a fresh cache
    await prisma.calendarCache.deleteMany({ where: { credentialId } });
    const calendar = await this.authedCalendar();
    await calendar.channels
      .stop({
        requestBody: {
          resourceId: sc?.googleChannelResourceId,
          id: sc?.googleChannelId,
        },
      })
      .catch((err) => {
        console.warn(JSON.stringify(err));
      });
    await GoogleRepository.upsertSelectedCalendar({
      userId: this.credential.userId!,
      externalId: calendarId,
      credentialId: this.credential.id,
      googleChannelId: null,
      googleChannelKind: null,
      googleChannelResourceId: null,
      googleChannelResourceUri: null,
      googleChannelExpiration: null,
    });
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
