/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Prisma } from "@prisma/client";
import type { calendar_v3 } from "googleapis";
import { google } from "googleapis";

import { MeetLocationType } from "@calcom/app-store/locations";
import { getLocation, getRichDescription } from "@calcom/lib/CalEventParser";
import type CalendarService from "@calcom/lib/CalendarService";
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

import { getGoogleAppKeys } from "./getGoogleAppKeys";
import { googleCredentialSchema } from "./googleCredentialSchema";

interface GoogleCalError extends Error {
  code?: number;
}

export default class GoogleCalendarService implements Calendar {
  private integrationName = "";
  private auth: { getToken: () => Promise<MyGoogleAuth> };
  private log: typeof logger;

  constructor(credential: CredentialPayload) {
    this.integrationName = "google_calendar";
    this.auth = this.googleAuth(credential);
    this.log = logger.getChildLogger({ prefix: [`[[lib] ${this.integrationName}`] });
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
        const { res } = await myGoogleAuth.refreshToken(googleCredentials.refresh_token);
        const token = res?.data;
        googleCredentials.access_token = token.access_token;
        googleCredentials.expiry_date = token.expiry_date;
        const key = googleCredentialSchema.parse(googleCredentials);
        await prisma.credential.update({
          where: { id: credential.id },
          data: { key },
        });
        myGoogleAuth.setCredentials(googleCredentials);
      } catch (err) {
        this.log.error("Error refreshing google token", err);
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

  async createEvent(calEventRaw: CalendarEvent): Promise<NewCalendarEventType> {
    const eventAttendees = calEventRaw.attendees.map(({ id: _id, ...rest }) => ({
      ...rest,
      responseStatus: "accepted",
    }));
    // TODO: Check every other CalendarService for team members
    const teamMembers =
      calEventRaw.team?.members.map((m) => ({
        email: m.email,
        displayName: m.name,
        responseStatus: "accepted",
      })) || [];
    return new Promise(async (resolve, reject) => {
      const myGoogleAuth = await this.auth.getToken();
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
        attendees: [
          {
            ...calEventRaw.organizer,
            id: String(calEventRaw.organizer.id),
            responseStatus: "accepted",
            organizer: true,
            email: calEventRaw.destinationCalendar?.externalId
              ? calEventRaw.destinationCalendar.externalId
              : calEventRaw.organizer.email,
          },
          ...eventAttendees,
          ...teamMembers,
        ],
        reminders: {
          useDefault: true,
        },
        guestsCanSeeOtherGuests: !!calEventRaw.seatsPerTimeSlot ? calEventRaw.seatsShowAttendees : true,
      };

      if (calEventRaw.location) {
        payload["location"] = getLocation(calEventRaw);
      }

      if (calEventRaw.conferenceData && calEventRaw.location === MeetLocationType) {
        payload["conferenceData"] = calEventRaw.conferenceData;
      }
      const calendar = google.calendar({
        version: "v3",
      });
      const selectedCalendar = calEventRaw.destinationCalendar?.externalId
        ? calEventRaw.destinationCalendar.externalId
        : "primary";
      calendar.events.insert(
        {
          auth: myGoogleAuth,
          calendarId: selectedCalendar,
          requestBody: payload,
          conferenceDataVersion: 1,
          sendUpdates: "none",
        },
        function (error, event) {
          if (error || !event?.data) {
            console.error("There was an error contacting google calendar service: ", error);
            return reject(error);
          }

          if (event && event.data.id && event.data.hangoutLink) {
            calendar.events.patch({
              // Update the same event but this time we know the hangout link
              calendarId: selectedCalendar,
              auth: myGoogleAuth,
              eventId: event.data.id || "",
              requestBody: {
                description: getRichDescription({
                  ...calEventRaw,
                  additionalInformation: { hangoutLink: event.data.hangoutLink },
                }),
              },
            });
          }
          return resolve({
            uid: "",
            ...event.data,
            id: event.data.id || "",
            additionalInfo: {
              hangoutLink: event.data.hangoutLink || "",
            },
            type: "google_calendar",
            password: "",
            url: "",
            iCalUID: event.data.iCalUID,
          });
        }
      );
    });
  }

  async updateEvent(uid: string, event: CalendarEvent, externalCalendarId: string): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const myGoogleAuth = await this.auth.getToken();
      const eventAttendees = event.attendees.map(({ ...rest }) => ({
        ...rest,
        responseStatus: "accepted",
      }));
      const teamMembers =
        event.team?.members.map((m) => ({
          email: m.email,
          displayName: m.name,
          responseStatus: "accepted",
        })) || [];
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
        attendees: [
          {
            ...event.organizer,
            id: String(event.organizer.id),
            organizer: true,
            responseStatus: "accepted",
            email: event.destinationCalendar?.externalId
              ? event.destinationCalendar.externalId
              : event.organizer.email,
          },
          ...(eventAttendees as any),
          ...(teamMembers as any),
        ],
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

      const calendar = google.calendar({
        version: "v3",
        auth: myGoogleAuth,
      });

      const selectedCalendar = externalCalendarId
        ? externalCalendarId
        : event.destinationCalendar?.externalId;

      calendar.events.update(
        {
          auth: myGoogleAuth,
          calendarId: selectedCalendar,
          eventId: uid,
          sendNotifications: true,
          sendUpdates: "none",
          requestBody: payload,
          conferenceDataVersion: 1,
        },
        function (err, evt) {
          if (err) {
            console.error("There was an error contacting google calendar service: ", err);
            return reject(err);
          }

          if (evt && evt.data.id && evt.data.hangoutLink && event.location === MeetLocationType) {
            calendar.events.patch({
              // Update the same event but this time we know the hangout link
              calendarId: selectedCalendar,
              auth: myGoogleAuth,
              eventId: evt.data.id || "",
              requestBody: {
                description: getRichDescription({
                  ...event,
                  additionalInformation: { hangoutLink: evt.data.hangoutLink },
                }),
              },
            });
            return resolve({
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
            });
          }
          return resolve(evt?.data);
        }
      );
    });
  }

  async deleteEvent(uid: string, event: CalendarEvent, externalCalendarId?: string | null): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const myGoogleAuth = await this.auth.getToken();
      const calendar = google.calendar({
        version: "v3",
        auth: myGoogleAuth,
      });

      const defaultCalendarId = "primary";
      const calendarId = externalCalendarId ? externalCalendarId : event.destinationCalendar?.externalId;

      calendar.events.delete(
        {
          auth: myGoogleAuth,
          calendarId: calendarId ? calendarId : defaultCalendarId,
          eventId: uid,
          sendNotifications: false,
          sendUpdates: "none",
        },
        function (err: GoogleCalError | null, event) {
          if (err) {
            /**
             *  410 is when an event is already deleted on the Google cal before on cal.com
             *  404 is when the event is on a different calendar
             */
            if (err.code === 410) return resolve();
            console.error("There was an error contacting google calendar service: ", err);
            if (err.code === 404) return resolve();
            return reject(err);
          }
          return resolve(event?.data);
        }
      );
    });
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
  ): Promise<EventBusyDate[]> {
    return new Promise(async (resolve, reject) => {
      const myGoogleAuth = await this.auth.getToken();
      const calendar = google.calendar({
        version: "v3",
        auth: myGoogleAuth,
      });
      const selectedCalendarIds = selectedCalendars
        .filter((e) => e.integration === this.integrationName)
        .map((e) => e.externalId);
      if (selectedCalendarIds.length === 0 && selectedCalendars.length > 0) {
        // Only calendars of other integrations selected
        resolve([]);
        return;
      }

      (selectedCalendarIds.length === 0
        ? calendar.calendarList
            .list()
            .then((cals) => cals.data.items?.map((cal) => cal.id).filter(Boolean) || [])
        : Promise.resolve(selectedCalendarIds)
      )
        .then((calsIds) => {
          calendar.freebusy.query(
            {
              requestBody: {
                timeMin: dateFrom,
                timeMax: dateTo,
                items: calsIds.map((id) => ({ id: id })),
              },
            },
            (err, apires) => {
              if (err) return reject(err);
              // If there's no calendar we just skip
              if (!apires?.data.calendars) return resolve([]);
              const result = Object.values(apires.data.calendars).reduce((c, i) => {
                i.busy?.forEach((busyTime) => {
                  c.push({
                    start: busyTime.start || "",
                    end: busyTime.end || "",
                  });
                });
                return c;
              }, [] as Prisma.PromiseReturnType<CalendarService["getAvailability"]>);

              resolve(result);
            }
          );
        })
        .catch((err) => {
          this.log.error("There was an error contacting google calendar service: ", err);

          reject(err);
        });
    });
  }

  async listCalendars(): Promise<IntegrationCalendar[]> {
    return new Promise(async (resolve, reject) => {
      const myGoogleAuth = await this.auth.getToken();
      const calendar = google.calendar({
        version: "v3",
        auth: myGoogleAuth,
      });

      calendar.calendarList
        .list()
        .then((cals) => {
          resolve(
            cals.data.items?.map((cal) => {
              const calendar: IntegrationCalendar = {
                externalId: cal.id ?? "No id",
                integration: this.integrationName,
                name: cal.summary ?? "No name",
                primary: cal.primary ?? false,
                readOnly: !(cal.accessRole === "reader" || cal.accessRole === "owner") && true,
                email: cal.id ?? "",
              };
              return calendar;
            }) || []
          );
        })
        .catch((err: Error) => {
          this.log.error("There was an error contacting google calendar service: ", err);

          reject(err);
        });
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
