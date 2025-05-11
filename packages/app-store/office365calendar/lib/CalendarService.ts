import type { Calendar as OfficeCalendar, User, Event } from "@microsoft/microsoft-graph-types-beta";
import type { DefaultBodyType } from "msw";

import dayjs from "@calcom/dayjs";
import { getLocation, getRichDescription } from "@calcom/lib/CalEventParser";
import {
  CalendarAppDelegationCredentialInvalidGrantError,
  CalendarAppDelegationCredentialConfigurationError,
} from "@calcom/lib/CalendarAppError";
import { handleErrorsJson, handleErrorsRaw } from "@calcom/lib/errors";
import { formatCalEvent } from "@calcom/lib/formatCalendarEvent";
import logger from "@calcom/lib/logger";
import type { BufferedBusyTime } from "@calcom/types/BufferedBusyTime";
import type {
  Calendar,
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";
import type { CredentialForCalendarServiceWithTenantId } from "@calcom/types/Credential";

import { OAuthManager } from "../../_utils/oauth/OAuthManager";
import { getTokenObjectFromCredential } from "../../_utils/oauth/getTokenObjectFromCredential";
import { oAuthManagerHelper } from "../../_utils/oauth/oAuthManagerHelper";
import metadata from "../_metadata";
import { getOfficeAppKeys } from "./getOfficeAppKeys";

interface IRequest {
  method: string;
  url: string;
  id: number;
}

interface ISettledResponse {
  id: string;
  status: number;
  headers: {
    "retry-after": string;
    "content-type": string;
  };
  body: Record<string, unknown>;
}

type BatchResponse = {
  responses: ISettledResponse[];
};

type BodyValue = {
  showAs: string;
  start: {
    dateTime: string;
  };
  end: {
    dateTime: string;
  };
};

interface MicrosoftOfficeLocationInterface {
  displayName?: string;
  locationType?: string;
  uniqueId?: string;
  uniqueIdType?: string;
}

interface MicrosoftOfficeOnlineMeetingInterface {
  joinUrl?: string;
}

export default class Office365CalendarService implements Calendar {
  private url = "https://graph.microsoft.com/v1.0";
  private auth: OAuthManager;
  private log: typeof logger;
  private credential: CredentialForCalendarServiceWithTenantId;

  constructor(credential: CredentialForCalendarServiceWithTenantId) {
    this.credential = credential;
    this.log = logger.getSubLogger({ prefix: ["office365-calendar"] });
    this.auth = this.createOAuth2Client();
  }

  private createOAuth2Client() {
    const auth = oAuthManagerHelper({
      providerName: "office365-calendar",
      tokenObjectFromCredential: getTokenObjectFromCredential(this.credential),
      refreshAccessToken: async ({ refreshToken }) => {
        try {
          const { client_id, client_secret } = await getOfficeAppKeys();
          const appConfig = {
            clientId: client_id,
            clientSecret: client_secret,
            redirectURI: "https://api.cal.com/v1/auth/office365calendar/callback",
          };
          return await this.auth.refreshAccessToken(refreshToken, appConfig);
        } catch (error) {
          this.log.error("Error refreshing office365 token", error);
          let message = "Error refreshing office365 token";
          if (error instanceof Error) message = error.message;
          throw new Error(message);
        }
      },
      getTokens: async ({ code }) => {
        try {
          const { client_id, client_secret } = await getOfficeAppKeys();
          const appConfig = {
            clientId: client_id,
            clientSecret: client_secret,
            redirectURI: "https://api.cal.com/v1/auth/office365calendar/callback",
          };
          return await this.auth.getTokens(code, appConfig);
        } catch (error) {
          this.log.error("Error getting office365 tokens", error);
          let message = "Error getting office365 tokens";
          if (error instanceof Error) message = error.message;
          throw new Error(message);
        }
      },
    });

    return auth;
  }

  async createEvent(event: CalendarEvent): Promise<NewCalendarEventType> {
    try {
      const calendarId = event.destinationCalendar?.externalId
        ? `${event.destinationCalendar.externalId}/`
        : "";

      const response = await this.auth
        .requestRaw({
          url: `${this.url}/me/calendars/${calendarId}events`,
          method: "POST",
          body: this.translateEvent(event),
        })
        .then(handleErrorsJson);

      return {
        uid: response.id as string,
        id: response.id as string,
        type: "office365_calendar",
        password: "",
        url: response.webLink,
        additionalInfo: {
          showAs: response.showAs,
          eventType: response.type,
          calendarId: response.calendar?.id,
        },
      };
    } catch (error) {
      this.log.error("Error creating office365 calendar event", error);
      throw error;
    }
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<any> {
    try {
      const response = await this.auth
        .requestRaw({
          url: `${this.url}/me/events/${uid}`,
          method: "PATCH",
          body: this.translateEvent(event),
        })
        .then(handleErrorsRaw);

      return response;
    } catch (error) {
      this.log.error("Error updating office365 calendar event", error);
      throw error;
    }
  }

  async deleteEvent(uid: string): Promise<void> {
    try {
      await this.auth
        .requestRaw({
          url: `${this.url}/me/events/${uid}`,
          method: "DELETE",
        })
        .then(handleErrorsRaw);
    } catch (error) {
      this.log.error("Error deleting office365 calendar event", error);
      throw error;
    }
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
  ): Promise<EventBusyDate[]> {
    const dateFromParsed = dayjs(dateFrom).startOf("day").format();
    const dateToParsed = dayjs(dateTo).endOf("day").format();

    try {
      const selectedCalendarIds = selectedCalendars
        .filter((e) => e.integration === "office365_calendar")
        .map((e) => e.externalId);
      if (selectedCalendarIds.length === 0 && selectedCalendars.length > 0) {
        // Only calendars of other integrations selected
        return [];
      }

      const filter = `startDateTime=${encodeURIComponent(dateFromParsed)}&endDateTime=${encodeURIComponent(
        dateToParsed
      )}`;

      const calendarSelectParams = selectedCalendarIds.length
        ? "&$select=showAs,start,end,subject"
        : "";

      const response = await this.auth
        .requestRaw({
          url: `${this.url}/me/calendarView?${filter}${calendarSelectParams}`,
          method: "GET",
          headers: {
            Prefer: 'outlook.timezone="Etc/GMT"',
          },
        })
        .then(handleErrorsJson);

      const responseBody = response.value;
      const busyTimes = responseBody.reduce((acc: BufferedBusyTime[], evt: BodyValue) => {
        if (evt.showAs === "free" || evt.showAs === "workingElsewhere") return acc;
        return acc.concat({
          start: evt.start.dateTime + "Z",
          end: evt.end.dateTime + "Z",
        });
      }, []);

      return busyTimes;
    } catch (error) {
      this.log.error("Error getting office365 availability", error);
      throw error;
    }
  }

  async listCalendars(): Promise<IntegrationCalendar[]> {
    try {
      const response = await this.auth
        .requestRaw({
          url: `${this.url}/me/calendars`,
          method: "GET",
        })
        .then(handleErrorsJson);
      return response.value.map((cal: { id: string; name: string; isDefaultCalendar?: boolean }) => {
        return {
          externalId: cal.id,
          integration: "office365_calendar",
          name: cal.name,
          primary: !!cal.isDefaultCalendar,
          email: this.credential.key.email,
        };
      });
    } catch (error) {
      this.log.error("Error getting office365 calendars", error);
      throw error;
    }
  }

  private translateEvent = (event: CalendarEvent) => {
    // Documentation of Microsoft Graph events:
    // https://learn.microsoft.com/en-us/graph/api/resources/event?view=graph-rest-1.0
    const attendees = event.attendees
      .filter((attendee) => attendee.email)
      .map((attendee) => ({
        emailAddress: {
          address: attendee.email,
          name: attendee.name,
        },
        type: "required",
      }));

    // If event.location is set, we need to use it as the location for the event
    // If event.location is not set, we need to use the default location for the event (which is the event.videoCallData.url if it exists)
    const office365Event: {
      subject: string;
      body: {
        contentType: string;
        content: string;
      };
      start: {
        dateTime: string;
        timeZone: string;
      };
      end: {
        dateTime: string;
        timeZone: string;
      };
      attendees: {
        emailAddress: {
          address: string;
          name?: string | undefined;
        };
        type: string;
      }[];
      location?: MicrosoftOfficeLocationInterface;
      isOnlineMeeting?: boolean;
      onlineMeetingProvider?: string;
      onlineMeeting?: MicrosoftOfficeOnlineMeetingInterface;
      sensitivity?: string;
    } = {
      subject: event.title,
      body: {
        contentType: "HTML",
        content: getRichDescription(event),
      },
      start: {
        dateTime: event.startTime,
        timeZone: event.organizer.timeZone,
      },
      end: {
        dateTime: event.endTime,
        timeZone: event.organizer.timeZone,
      },
      attendees,
    };

    // Handle location and online meetings
    if (event.videoCallData && event.videoCallData.type === "office365_video") {
      // This is a Microsoft Teams meeting
      office365Event.isOnlineMeeting = true;
      office365Event.onlineMeetingProvider = "teamsForBusiness";
      office365Event.onlineMeeting = {
        joinUrl: event.videoCallData.url
      };
      
      // Set the location to the Teams meeting
      office365Event.location = {
        displayName: "Microsoft Teams Meeting",
        locationType: "virtual",
        uniqueId: event.videoCallData.url,
        uniqueIdType: "other"
      };
    } else if (event.location) {
      // Handle regular location
      office365Event.location = { displayName: getLocation(event) };
    }
    
    if (event.hideCalendarEventDetails) {
      office365Event.sensitivity = "private";
    }

    return office365Event;
  };

  private o365Calendar = {
    parseEvent: (event: Event): CalendarEvent => {
      return {
        uid: event.id!,
        id: event.id!,
        startTime: event.start?.dateTime || "",
        endTime: event.end?.dateTime || "",
        title: event.subject!,
        description: event.body?.content || "",
        location: event.location?.displayName || "",
        organizer: { email: event.organizer?.emailAddress?.address!, name: event.organizer?.emailAddress?.name! },
        attendees: event.attendees?.map((attendee) => ({
          email: attendee.emailAddress?.address!,
          name: attendee.emailAddress?.name!,
          partstat: attendee.status?.response === "accepted" ? "accepted" : "pending",
        }))!,
        language: "en",
      };
    },
    parseBusyTimes: (response: BatchResponse[]) => {
      return response.reduce(
        (acc: BufferedBusyTime[], subResponse: { body: { value?: BodyValue[]; error?: Error[] } }) => {
          if (!subResponse.body?.value) return acc;
          return acc.concat(
            subResponse.body.value.reduce((acc: BufferedBusyTime[], evt: BodyValue) => {
              if (evt.showAs === "free" || evt.showAs === "workingElsewhere") return acc;
              return acc.concat({
                start: `${evt.start.dateTime}Z`,
                end: `${evt.end.dateTime}Z`,
              });
            }, [])
          );
        },
        []
      );
    };
  };

  private handleErrorJsonOffice365Calendar = <Type>(response: Response): Promise<Type | string> => {
    if (response.headers.get("content-encoding") === "gzip") {
      return response.text();
    }

    if (response.status === 204) {
      return new Promise((resolve) => resolve({} as Type));
    }

    if (!response.ok && response.status < 200 && response.status >= 300) {
      response.json().then(console.log);
      throw Error(response.statusText);
    }

    return response.json();
  };
}
