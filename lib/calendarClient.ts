import EventOrganizerMail from "./emails/EventOrganizerMail";
import EventAttendeeMail from "./emails/EventAttendeeMail";
import EventOrganizerRescheduledMail from "./emails/EventOrganizerRescheduledMail";
import EventAttendeeRescheduledMail from "./emails/EventAttendeeRescheduledMail";
import prisma from "./prisma";
import { Credential } from "@prisma/client";
import CalEventParser from "./CalEventParser";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { google } = require("googleapis");

const googleAuth = (credential) => {
  const { client_secret, client_id, redirect_uris } = JSON.parse(process.env.GOOGLE_API_CREDENTIALS).web;
  const myGoogleAuth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  myGoogleAuth.setCredentials(credential.key);

  const isExpired = () => myGoogleAuth.isTokenExpiring();

  const refreshAccessToken = () =>
    myGoogleAuth
      .refreshToken(credential.key.refresh_token)
      .then((res) => {
        const token = res.res.data;
        credential.key.access_token = token.access_token;
        credential.key.expiry_date = token.expiry_date;
        return prisma.credential
          .update({
            where: {
              id: credential.id,
            },
            data: {
              key: credential.key,
            },
          })
          .then(() => {
            myGoogleAuth.setCredentials(credential.key);
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

function handleErrorsJson(response) {
  if (!response.ok) {
    response.json().then((e) => console.error("O365 Error", e));
    throw Error(response.statusText);
  }
  return response.json();
}

function handleErrorsRaw(response) {
  if (!response.ok) {
    response.text().then((e) => console.error("O365 Error", e));
    throw Error(response.statusText);
  }
  return response.text();
}

const o365Auth = (credential) => {
  const isExpired = (expiryDate) => expiryDate < Math.round(+new Date() / 1000);

  const refreshAccessToken = (refreshToken) => {
    return fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        scope: "User.Read Calendars.Read Calendars.ReadWrite",
        client_id: process.env.MS_GRAPH_CLIENT_ID,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        client_secret: process.env.MS_GRAPH_CLIENT_SECRET,
      }),
    })
      .then(handleErrorsJson)
      .then((responseBody) => {
        credential.key.access_token = responseBody.access_token;
        credential.key.expiry_date = Math.round(+new Date() / 1000 + responseBody.expires_in);
        return prisma.credential
          .update({
            where: {
              id: credential.id,
            },
            data: {
              key: credential.key,
            },
          })
          .then(() => credential.key.access_token);
      });
  };

  return {
    getToken: () =>
      !isExpired(credential.key.expiry_date)
        ? Promise.resolve(credential.key.access_token)
        : refreshAccessToken(credential.key.refresh_token),
  };
};

interface Person {
  name?: string;
  email: string;
  timeZone: string;
}

export interface CalendarEvent {
  type: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  location?: string;
  organizer: Person;
  attendees: Person[];
  conferenceData?: ConferenceData;
}

export interface ConferenceData {
  createRequest: unknown;
}

export interface IntegrationCalendar {
  integration: string;
  primary: boolean;
  externalId: string;
  name: string;
}

export interface CalendarApiAdapter {
  createEvent(event: CalendarEvent): Promise<unknown>;

  updateEvent(uid: string, event: CalendarEvent);

  deleteEvent(uid: string);

  getAvailability(dateFrom, dateTo, selectedCalendars: IntegrationCalendar[]): Promise<unknown>;

  listCalendars(): Promise<IntegrationCalendar[]>;
}

const MicrosoftOffice365Calendar = (credential): CalendarApiAdapter => {
  const auth = o365Auth(credential);

  const translateEvent = (event: CalendarEvent) => {
    const optional = {};
    if (event.location) {
      optional.location = { displayName: event.location };
    }

    return {
      subject: event.title,
      body: {
        contentType: "HTML",
        content: event.description,
      },
      start: {
        dateTime: event.startTime,
        timeZone: event.organizer.timeZone,
      },
      end: {
        dateTime: event.endTime,
        timeZone: event.organizer.timeZone,
      },
      attendees: event.attendees.map((attendee) => ({
        emailAddress: {
          address: attendee.email,
          name: attendee.name,
        },
        type: "required",
      })),
      ...optional,
    };
  };

  const integrationType = "office365_calendar";

  function listCalendars(): Promise<IntegrationCalendar[]> {
    return auth.getToken().then((accessToken) =>
      fetch("https://graph.microsoft.com/v1.0/me/calendars", {
        method: "get",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json",
        },
      })
        .then(handleErrorsJson)
        .then((responseBody) => {
          return responseBody.value.map((cal) => {
            const calendar: IntegrationCalendar = {
              externalId: cal.id,
              integration: integrationType,
              name: cal.name,
              primary: cal.isDefaultCalendar,
            };
            return calendar;
          });
        })
    );
  }

  return {
    getAvailability: (dateFrom, dateTo, selectedCalendars) => {
      const filter = "?$filter=start/dateTime ge '" + dateFrom + "' and end/dateTime le '" + dateTo + "'";
      return auth
        .getToken()
        .then((accessToken) => {
          const selectedCalendarIds = selectedCalendars
            .filter((e) => e.integration === integrationType)
            .map((e) => e.externalId);
          if (selectedCalendarIds.length == 0 && selectedCalendars.length > 0) {
            // Only calendars of other integrations selected
            return Promise.resolve([]);
          }

          return (
            selectedCalendarIds.length == 0
              ? listCalendars().then((cals) => cals.map((e) => e.externalId))
              : Promise.resolve(selectedCalendarIds).then((x) => x)
          ).then((ids: string[]) => {
            const requests = ids.map((calendarId, id) => ({
              id,
              method: "GET",
              headers: {
                Prefer: 'outlook.timezone="Etc/GMT"',
              },
              url: `/me/calendars/${calendarId}/events${filter}`,
            }));

            return fetch("https://graph.microsoft.com/v1.0/$batch", {
              method: "POST",
              headers: {
                Authorization: "Bearer " + accessToken,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ requests }),
            })
              .then(handleErrorsJson)
              .then((responseBody) =>
                responseBody.responses.reduce(
                  (acc, subResponse) =>
                    acc.concat(
                      subResponse.body.value.map((evt) => {
                        return {
                          start: evt.start.dateTime + "Z",
                          end: evt.end.dateTime + "Z",
                        };
                      })
                    ),
                  []
                )
              );
          });
        })
        .catch((err) => {
          console.log(err);
        });
    },
    createEvent: (event: CalendarEvent) =>
      auth.getToken().then((accessToken) =>
        fetch("https://graph.microsoft.com/v1.0/me/calendar/events", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(translateEvent(event)),
        })
          .then(handleErrorsJson)
          .then((responseBody) => ({
            ...responseBody,
            disableConfirmationEmail: true,
          }))
      ),
    deleteEvent: (uid: string) =>
      auth.getToken().then((accessToken) =>
        fetch("https://graph.microsoft.com/v1.0/me/calendar/events/" + uid, {
          method: "DELETE",
          headers: {
            Authorization: "Bearer " + accessToken,
          },
        }).then(handleErrorsRaw)
      ),
    updateEvent: (uid: string, event: CalendarEvent) =>
      auth.getToken().then((accessToken) =>
        fetch("https://graph.microsoft.com/v1.0/me/calendar/events/" + uid, {
          method: "PATCH",
          headers: {
            Authorization: "Bearer " + accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(translateEvent(event)),
        }).then(handleErrorsRaw)
      ),
    listCalendars,
  };
};

const GoogleCalendar = (credential): CalendarApiAdapter => {
  const auth = googleAuth(credential);
  const integrationType = "google_calendar";

  return {
    getAvailability: (dateFrom, dateTo, selectedCalendars) =>
      new Promise((resolve, reject) =>
        auth.getToken().then((myGoogleAuth) => {
          const calendar = google.calendar({ version: "v3", auth: myGoogleAuth });
          const selectedCalendarIds = selectedCalendars
            .filter((e) => e.integration === integrationType)
            .map((e) => e.externalId);
          if (selectedCalendarIds.length == 0 && selectedCalendars.length > 0) {
            // Only calendars of other integrations selected
            resolve([]);
            return;
          }

          (selectedCalendarIds.length == 0
            ? calendar.calendarList.list().then((cals) => cals.data.items.map((cal) => cal.id))
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
                  if (err) {
                    reject(err);
                  }
                  resolve(Object.values(apires.data.calendars).flatMap((item) => item["busy"]));
                }
              );
            })
            .catch((err) => {
              console.error("There was an error contacting google calendar service: ", err);
              reject(err);
            });
        })
      ),
    createEvent: (event: CalendarEvent) =>
      new Promise((resolve, reject) =>
        auth.getToken().then((myGoogleAuth) => {
          const payload = {
            summary: event.title,
            description: event.description,
            start: {
              dateTime: event.startTime,
              timeZone: event.organizer.timeZone,
            },
            end: {
              dateTime: event.endTime,
              timeZone: event.organizer.timeZone,
            },
            attendees: event.attendees,
            reminders: {
              useDefault: false,
              overrides: [{ method: "email", minutes: 10 }],
            },
          };

          if (event.location) {
            payload["location"] = event.location;
          }

          if (event.conferenceData) {
            payload["conferenceData"] = event.conferenceData;
          }

          const calendar = google.calendar({ version: "v3", auth: myGoogleAuth });
          calendar.events.insert(
            {
              auth: myGoogleAuth,
              calendarId: "primary",
              resource: payload,
              conferenceDataVersion: 1,
            },
            function (err, event) {
              if (err) {
                console.error("There was an error contacting google calendar service: ", err);
                return reject(err);
              }
              return resolve(event.data);
            }
          );
        })
      ),
    updateEvent: (uid: string, event: CalendarEvent) =>
      new Promise((resolve, reject) =>
        auth.getToken().then((myGoogleAuth) => {
          const payload = {
            summary: event.title,
            description: event.description,
            start: {
              dateTime: event.startTime,
              timeZone: event.organizer.timeZone,
            },
            end: {
              dateTime: event.endTime,
              timeZone: event.organizer.timeZone,
            },
            attendees: event.attendees,
            reminders: {
              useDefault: false,
              overrides: [{ method: "email", minutes: 10 }],
            },
          };

          if (event.location) {
            payload["location"] = event.location;
          }

          const calendar = google.calendar({ version: "v3", auth: myGoogleAuth });
          calendar.events.update(
            {
              auth: myGoogleAuth,
              calendarId: "primary",
              eventId: uid,
              sendNotifications: true,
              sendUpdates: "all",
              resource: payload,
            },
            function (err, event) {
              if (err) {
                console.error("There was an error contacting google calendar service: ", err);
                return reject(err);
              }
              return resolve(event.data);
            }
          );
        })
      ),
    deleteEvent: (uid: string) =>
      new Promise((resolve, reject) =>
        auth.getToken().then((myGoogleAuth) => {
          const calendar = google.calendar({ version: "v3", auth: myGoogleAuth });
          calendar.events.delete(
            {
              auth: myGoogleAuth,
              calendarId: "primary",
              eventId: uid,
              sendNotifications: true,
              sendUpdates: "all",
            },
            function (err, event) {
              if (err) {
                console.error("There was an error contacting google calendar service: ", err);
                return reject(err);
              }
              return resolve(event.data);
            }
          );
        })
      ),
    listCalendars: () =>
      new Promise((resolve, reject) =>
        auth.getToken().then((myGoogleAuth) => {
          const calendar = google.calendar({ version: "v3", auth: myGoogleAuth });
          calendar.calendarList
            .list()
            .then((cals) => {
              resolve(
                cals.data.items.map((cal) => {
                  const calendar: IntegrationCalendar = {
                    externalId: cal.id,
                    integration: integrationType,
                    name: cal.summary,
                    primary: cal.primary,
                  };
                  return calendar;
                })
              );
            })
            .catch((err) => {
              console.error("There was an error contacting google calendar service: ", err);
              reject(err);
            });
        })
      ),
  };
};

// factory
const calendars = (withCredentials): CalendarApiAdapter[] =>
  withCredentials
    .map((cred) => {
      switch (cred.type) {
        case "google_calendar":
          return GoogleCalendar(cred);
        case "office365_calendar":
          return MicrosoftOffice365Calendar(cred);
        default:
          return; // unknown credential, could be legacy? In any case, ignore
      }
    })
    .filter(Boolean);

const getBusyCalendarTimes = (withCredentials, dateFrom, dateTo, selectedCalendars) =>
  Promise.all(
    calendars(withCredentials).map((c) => c.getAvailability(dateFrom, dateTo, selectedCalendars))
  ).then((results) => {
    return results.reduce((acc, availability) => acc.concat(availability), []);
  });

const listCalendars = (withCredentials) =>
  Promise.all(calendars(withCredentials).map((c) => c.listCalendars())).then((results) =>
    results.reduce((acc, calendars) => acc.concat(calendars), [])
  );

const createEvent = async (credential: Credential, calEvent: CalendarEvent): Promise<unknown> => {
  const parser: CalEventParser = new CalEventParser(calEvent);
  const uid: string = parser.getUid();
  /*
   * Matching the credential type is a workaround because the office calendar simply strips away newlines (\n and \r).
   * We need HTML there. Google Calendar understands newlines and Apple Calendar cannot show HTML, so no HTML should
   * be used for Google and Apple Calendar.
   */
  const richEvent: CalendarEvent = parser.asRichEventPlain();

  const creationResult = credential ? await calendars([credential])[0].createEvent(richEvent) : null;

  const maybeHangoutLink = creationResult?.hangoutLink;
  const maybeEntryPoints = creationResult?.entryPoints;
  const maybeConferenceData = creationResult?.conferenceData;

  const organizerMail = new EventOrganizerMail(calEvent, uid, {
    hangoutLink: maybeHangoutLink,
    conferenceData: maybeConferenceData,
    entryPoints: maybeEntryPoints,
  });

  const attendeeMail = new EventAttendeeMail(calEvent, uid, {
    hangoutLink: maybeHangoutLink,
    conferenceData: maybeConferenceData,
    entryPoints: maybeEntryPoints,
  });

  try {
    await organizerMail.sendEmail();
  } catch (e) {
    console.error("organizerMail.sendEmail failed", e);
  }

  if (!creationResult || !creationResult.disableConfirmationEmail) {
    try {
      await attendeeMail.sendEmail();
    } catch (e) {
      console.error("attendeeMail.sendEmail failed", e);
    }
  }

  return {
    uid,
    createdEvent: creationResult,
  };
};

const updateEvent = async (
  credential: Credential,
  uidToUpdate: string,
  calEvent: CalendarEvent
): Promise<unknown> => {
  const parser: CalEventParser = new CalEventParser(calEvent);
  const newUid: string = parser.getUid();
  const richEvent: CalendarEvent = parser.asRichEventPlain();

  const updateResult = credential
    ? await calendars([credential])[0].updateEvent(uidToUpdate, richEvent)
    : null;

  const organizerMail = new EventOrganizerRescheduledMail(calEvent, newUid);
  const attendeeMail = new EventAttendeeRescheduledMail(calEvent, newUid);
  try {
    await organizerMail.sendEmail();
  } catch (e) {
    console.error("organizerMail.sendEmail failed", e);
  }

  if (!updateResult || !updateResult.disableConfirmationEmail) {
    try {
      await attendeeMail.sendEmail();
    } catch (e) {
      console.error("attendeeMail.sendEmail failed", e);
    }
  }

  return {
    uid: newUid,
    updatedEvent: updateResult,
  };
};

const deleteEvent = (credential: Credential, uid: string): Promise<unknown> => {
  if (credential) {
    return calendars([credential])[0].deleteEvent(uid);
  }

  return Promise.resolve({});
};

export {
  getBusyCalendarTimes,
  createEvent,
  updateEvent,
  deleteEvent,
  CalendarEvent,
  listCalendars,
  IntegrationCalendar,
};
