/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Prisma } from "@prisma/client";
import type { calendar_v3 } from "googleapis";
import { google } from "googleapis";
import { RRule } from "rrule";
import { v4 as uuid } from "uuid";

import { MeetLocationType } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";
import { getLocation, getRichDescription } from "@calcom/lib/CalEventParser";
import type CalendarService from "@calcom/lib/CalendarService";
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

import type { ParseRefreshTokenResponse } from "../../_utils/oauth/parseRefreshTokenResponse";
import parseRefreshTokenResponse from "../../_utils/oauth/parseRefreshTokenResponse";
import refreshOAuthTokens from "../../_utils/oauth/refreshOAuthTokens";
import { getGoogleAppKeys } from "./getGoogleAppKeys";
import { googleCredentialSchema } from "./googleCredentialSchema";

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
  private auth: { getToken: () => Promise<MyGoogleAuth> };
  private log: typeof logger;
  private credential: CredentialPayload;

  constructor(credential: CredentialPayload) {
    this.integrationName = "google_calendar";
    this.credential = credential;
    this.auth = this.googleAuth(credential);
    this.log = logger.getSubLogger({ prefix: [`[[lib] ${this.integrationName}`] });
    this.credential = credential;
  }

  private googleAuth = (credential: CredentialPayload) => {
    const googleCredentials = googleCredentialSchema.parse(credential.key);

    async function getGoogleAuth() {
      const { client_id, client_secret, redirect_uris } = await getGoogleAppKeys();
      const myGoogleAuth = new MyGoogleAuth(client_id, client_secret, redirect_uris[0]);
      myGoogleAuth.setCredentials(googleCredentials);
      return myGoogleAuth;
    }

    const refreshAccessToken = async (myGoogleAuth: Awaited<ReturnType<typeof getGoogleAuth>>) => {
      try {
        const res = await refreshOAuthTokens(
          async () => {
            const fetchTokens = await myGoogleAuth.refreshToken(googleCredentials.refresh_token);
            return fetchTokens.res;
          },
          "google-calendar",
          credential.userId
        );
        const token = res?.data;
        googleCredentials.access_token = token.access_token;
        googleCredentials.expiry_date = token.expiry_date;
        const parsedKey: ParseRefreshTokenResponse<typeof googleCredentialSchema> = parseRefreshTokenResponse(
          googleCredentials,
          googleCredentialSchema
        );
        await prisma.credential.update({
          where: { id: credential.id },
          data: { key: { ...parsedKey } as Prisma.InputJsonValue },
        });
        myGoogleAuth.setCredentials(googleCredentials);
      } catch (err) {
        this.log.error("Error Refreshing Google Token", safeStringify(err));
        let message;
        if (err instanceof Error) message = err.message;
        else message = String(err);
        // if not invalid_grant, default behaviour (which admittedly isn't great)
        if (message !== "invalid_grant") return myGoogleAuth;
        // when the error is invalid grant, it's unrecoverable and the credential marked invalid.
        // TODO: Evaluate bubbling up and handling this in the CalendarManager. IMO this should be done
        //       but this is a bigger refactor.
        await prisma.credential.update({
          where: { id: credential.id },
          data: {
            invalid: true,
          },
        });
      }
      return myGoogleAuth;
    };
    return {
      getToken: async () => {
        const myGoogleAuth = await getGoogleAuth();
        const isExpired = () => myGoogleAuth.isTokenExpiring();
        return !isExpired() ? Promise.resolve(myGoogleAuth) : refreshAccessToken(myGoogleAuth);
      },
    };
  };

  public authedCalendar = async () => {
    const myGoogleAuth = await this.auth.getToken();
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
    const payload: calendar_v3.Schema$Event = {
      summary: calEventRaw.title,
      description: getRichDescription(calEventRaw),
      start: {
        dateTime: calEventRaw.startTime,
        timeZone: calEventRaw.organizer.timeZone,
      },
      end: {
        dateTime: calEventRaw.endTime,
        timeZone: calEventRaw.organizer.timeZone,
      },
      attendees: this.getAttendees(calEventRaw),
      reminders: {
        useDefault: true,
      },
      guestsCanSeeOtherGuests: !!calEventRaw.seatsPerTimeSlot ? calEventRaw.seatsShowAttendees : true,
      iCalUID: calEventRaw.iCalUID,
    };

    if (calEventRaw.location) {
      payload["location"] = getLocation(calEventRaw);
    }

    if (calEventRaw.recurringEvent) {
      const rule = new RRule({
        freq: calEventRaw.recurringEvent.freq,
        interval: calEventRaw.recurringEvent.interval,
        count: calEventRaw.recurringEvent.count,
      });

      payload["recurrence"] = [rule.toString()];
    }

    if (calEventRaw.conferenceData && calEventRaw.location === MeetLocationType) {
      payload["conferenceData"] = calEventRaw.conferenceData;
    }
    const calendar = await this.authedCalendar();
    // Find in calEventRaw.destinationCalendar the one with the same credentialId

    const selectedCalendar =
      calEventRaw.destinationCalendar?.find((cal) => cal.credentialId === credentialId)?.externalId ||
      "primary";

    try {
      let event;
      let recurringEventId = null;
      if (calEventRaw.existingRecurringEvent) {
        recurringEventId = calEventRaw.existingRecurringEvent.recurringEventId;
        const recurringEventInstances = await calendar.events.instances({
          calendarId: selectedCalendar,
          eventId: calEventRaw.existingRecurringEvent.recurringEventId,
        });
        if (recurringEventInstances.data.items) {
          const calComEventStartTime = dayjs(calEventRaw.startTime).format();
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
              description: getRichDescription({
                ...calEventRaw,
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
              ...calEventRaw,
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
    const payload: calendar_v3.Schema$Event = {
      summary: event.title,
      description: getRichDescription(event),
      start: {
        dateTime: event.startTime,
        timeZone: event.organizer.timeZone,
      },
      end: {
        dateTime: event.endTime,
        timeZone: event.organizer.timeZone,
      },
      attendees: this.getAttendees(event),
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

  async getCacheOrFetchAvailability(args: FreeBusyArgs): Promise<calendar_v3.Schema$FreeBusyResponse> {
    const flags = await getFeatureFlagMap(prisma);
    const parsedArgs = parseArgsForCache(args);
    if (!flags["calendar-cache"]) {
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
    const calendar = await this.authedCalendar();
    try {
      const cals = await calendar.calendarList.list({ fields: "items(id,summary,primary,accessRole)" });
      if (!cals.data.items) return [];
      return cals.data.items.map(
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
        address: `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/integrations/googlecalendar/webhook`,
        token: process.env.CRON_API_KEY,
        params: {
          // The time-to-live in seconds for the notification channel. Default is 604800 seconds.
          ttl: `${Math.round(ONE_MONTH_IN_MS / 1000)}`,
        },
      },
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
