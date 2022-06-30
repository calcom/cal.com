/* eslint-disable @typescript-eslint/no-explicit-any */
import { Credential, Prisma } from "@prisma/client";
import prisma from "@lib/prisma";
import { Auth, google } from "googleapis";
import { CalendarEvent } from "@lib/calendarClient";
import { GetTokenResponse } from "google-auth-library/build/src/auth/oauth2client";
import { getLocation, NewCalendarEventType } from "./calendarService";
import { EventResult } from "./EventManager";
import CalEventParser from "@lib/CalEventParser";

const GOOGLE_API_CREDENTIALS = process.env.GOOGLE_API_CREDENTIALS || "";

const googleAuth = (credential: Credential) => {
  const { client_secret, client_id, redirect_uris } = JSON.parse(GOOGLE_API_CREDENTIALS).web;

  const myGoogleAuth = new MyGoogleAuth(client_id, client_secret, redirect_uris[0]);
  const googleCredentials = credential.key as Auth.Credentials;
  myGoogleAuth.setCredentials(googleCredentials);

  const isExpired = () => myGoogleAuth.isTokenExpiring();

  const refreshAccessToken = () =>
    myGoogleAuth
      .refreshToken(googleCredentials.refresh_token)
      .then((res: GetTokenResponse) => {
        const token = res.res?.data;
        googleCredentials.access_token = token.access_token;
        googleCredentials.expiry_date = token.expiry_date;
        return prisma.credential
          .update({
            where: {
              id: credential.id,
            },
            data: {
              key: googleCredentials as Prisma.InputJsonValue,
            },
          })
          .then(() => {
            myGoogleAuth.setCredentials(googleCredentials);
            return myGoogleAuth;
          });
      })
      .catch((err) => {
        console.error("Error refreshing google token", err);

        return myGoogleAuth;
      });

  return {
    getToken: () => (!isExpired() ? Promise.resolve(myGoogleAuth) : refreshAccessToken()),
  };
};

const createEventUrl = async (
  event: CalendarEvent,
  credential: Credential
): Promise<NewCalendarEventType> => {
  const auth = googleAuth(credential);
  return new Promise((resolve, reject) =>
    auth.getToken().then((myGoogleAuth) => {
      const payload = {
        summary: event.title,
        description: "",
        start: {
          dateTime: event.startTime,
          timeZone: event.organizer.timeZone,
        },
        end: {
          dateTime: event.endTime,
          timeZone: event.organizer.timeZone,
        },
        attendees: event.attendees.map((attendee) => ({
          ...attendee,
          responseStatus: "accepted",
        })),
        reminders: {
          useDefault: true,
        },
      };

      if (event.location) {
        payload["location"] = getLocation(event);
      }

      if (event.conferenceData && event.location === "integrations:google:meet") {
        payload["conferenceData"] = event.conferenceData;
      }

      const calendar = google.calendar({
        version: "v3",
        auth: myGoogleAuth,
      });
      calendar.events.insert(
        {
          auth: myGoogleAuth,
          calendarId: event.destinationCalendar?.externalId
            ? event.destinationCalendar.externalId
            : "primary",
          requestBody: payload as any,
          conferenceDataVersion: 1,
        },
        function (err, event) {
          if (err || !event?.data) {
            console.error("There was an error contacting google calendar service: ", err);
            return reject(err);
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
          });
        }
      );
    })
  );
};

const createEvent = async (credential: Credential, calEvent: CalendarEvent): Promise<EventResult> => {
  const parser: CalEventParser = new CalEventParser(calEvent);
  const uid: string = parser.getUid();
  let success = true;

  const creationResult =
    (await createEventUrl(calEvent, credential).catch((e) => {
      console.log("createEvent failed", e, calEvent);
      success = false;
      return undefined;
    })) || undefined;

  return {
    type: credential.type,
    success,
    uid,
    createdEvent: creationResult,
    originalEvent: calEvent,
  };
};

const getAvailabilityGoogleCalendar = async (
  dateFrom: string,
  dateTo: string,
  credential: Credential
): Promise<any> => {
  const auth = googleAuth(credential);

  return new Promise((resolve, reject) =>
    auth.getToken().then((myGoogleAuth) => {
      const calendar = google.calendar({
        version: "v3",
        auth: myGoogleAuth,
      });

      calendar.calendarList
        .list()
        .then((cals) => cals.data.items?.map((cal) => cal.id).filter(Boolean) || [])
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
              if (err) {
                reject(err);
              }
              let result = [] as any;

              if (apires?.data.calendars) {
                const key = Object.keys(apires?.data.calendars)[0];
                result = Object.values(apires.data.calendars).reduce((c, i) => {
                  i.busy?.forEach((busyTime) => {
                    c.push({
                      start: busyTime.start || "",
                      end: busyTime.end || "",
                      name: key,
                      subject: "",
                      calenderType: "google",
                    });
                  });
                  return c;
                }, [] as typeof result);
              }
              resolve(result);
            }
          );
        })
        .catch((err) => {
          console.error("There was an error contacting google calendar service: ", err);

          reject(err);
        });
    })
  );
};

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

export { createEvent, getAvailabilityGoogleCalendar };
