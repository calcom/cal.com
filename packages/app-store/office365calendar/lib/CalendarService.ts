import { Calendar as OfficeCalendar } from "@microsoft/microsoft-graph-types-beta";
import { Credential } from "@prisma/client";

import { getLocation, getRichDescription } from "@calcom/lib/CalEventParser";
import { handleErrorsJson, handleErrorsRaw } from "@calcom/lib/errors";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { BufferedBusyTime } from "@calcom/types/BufferedBusyTime";
import type {
  Calendar,
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { O365AuthCredentials } from "../types/Office365Calendar";

let client_id = "";
let client_secret = "";

interface IRequest {
  method: string;
  url: string;
  id: number;
}

interface ISettledResponse {
  id: string;
  status: number;
  headers: {
    "Retry-After": string;
    "Content-Type": string;
  };
  body: Record<string, any>;
}
export default class Office365CalendarService implements Calendar {
  private url = "";
  private integrationName = "";
  private log: typeof logger;
  private accessToken: string | null = null;
  auth: Promise<{ getToken: () => Promise<string> }>;

  constructor(credential: Credential) {
    this.integrationName = "office365_calendar";
    this.auth = this.o365Auth(credential).then((t) => t);

    this.log = logger.getChildLogger({ prefix: [`[[lib] ${this.integrationName}`] });
  }

  async createEvent(event: CalendarEvent): Promise<NewCalendarEventType> {
    try {
      this.accessToken = await (await this.auth).getToken();

      const calendarId = event.destinationCalendar?.externalId
        ? `${event.destinationCalendar.externalId}/`
        : "";

      const response = await fetch(`https://graph.microsoft.com/v1.0/me/calendars/${calendarId}events`, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + this.accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.translateEvent(event)),
      });

      return handleErrorsJson(response);
    } catch (error) {
      this.log.error(error);

      throw error;
    }
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<any> {
    try {
      const accessToken = await (await this.auth).getToken();

      const response = await fetch("https://graph.microsoft.com/v1.0/me/calendar/events/" + uid, {
        method: "PATCH",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.translateEvent(event)),
      });

      return handleErrorsRaw(response);
    } catch (error) {
      this.log.error(error);

      throw error;
    }
  }

  async deleteEvent(uid: string): Promise<void> {
    try {
      this.accessToken = await (await this.auth).getToken();

      const response = await fetch("https://graph.microsoft.com/v1.0/me/calendar/events/" + uid, {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + this.accessToken,
        },
      });

      handleErrorsRaw(response);
    } catch (error) {
      this.log.error(error);

      throw error;
    }
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
  ): Promise<EventBusyDate[]> {
    const dateFromParsed = new Date(dateFrom);
    const dateToParsed = new Date(dateTo);

    const filter = `?startDateTime=${encodeURIComponent(
      dateFromParsed.toISOString()
    )}&endDateTime=${encodeURIComponent(dateToParsed.toISOString())}`;
    return (await this.auth)
      .getToken()
      .then(async (accessToken) => {
        this.accessToken = accessToken;
        const selectedCalendarIds = selectedCalendars
          .filter((e) => e.integration === this.integrationName)
          .map((e) => e.externalId)
          .filter(Boolean);
        if (selectedCalendarIds.length === 0 && selectedCalendars.length > 0) {
          // Only calendars of other integrations selected
          return Promise.resolve([]);
        }

        const ids = await (selectedCalendarIds.length === 0
          ? this.listCalendars().then((cals) => cals.map((e_2) => e_2.externalId).filter(Boolean) || [])
          : Promise.resolve(selectedCalendarIds));
        const requests = ids.map((calendarId, id) => ({
          id,
          method: "GET",
          url: `/me/calendars/${calendarId}/calendarView${filter}`,
        }));
        let responseBody = await this.apiGraphBatchCall(requests);
        if (responseBody && responseBody.responses) {
          // @TODO: Handle error here
          return [];
        }

        if (responseBody && typeof responseBody === "string" && `${responseBody}`.indexOf("text/html") > -1) {
          responseBody = this.handleTextJsonResponseWithHtmlInBody(responseBody);
        }

        // // Inject 429 error
        // responseBody.responses = [
        //   {
        //     id: "1",
        //     status: 429,
        //     headers: {
        //       "Content-Type": "application/json",
        //       "Retry-After": "1",
        //     },
        //     body: { error: { code: "RateLimitExceeded", message: "Rate limit exceeded" } },
        //   },
        //   {
        //     id: "2",
        //     status: 429,
        //     headers: {
        //       "Content-Type": "application/json",
        //       "Retry-After": "1",
        //     },
        //     body: { error: { code: "RateLimitExceeded", message: "Rate limit exceeded" } },
        //   },
        //   {
        //     id: "3",
        //     status: 429,
        //     headers: {
        //       "Content-Type": "application/json",
        //       "Retry-After": "1",
        //     },
        //     body: { error: { code: "RateLimitExceeded", message: "Rate limit exceeded" } },
        //   },
        // ];

        // Validate if any 429 status Retry-After is present
        const retryAfter = !!responseBody?.responses && this.findRetryAfterResponse(responseBody.responses);
        console.log({ retryAfter });
        if (retryAfter && responseBody.responses) {
          responseBody = await this.callWithRetry(requests, responseBody.responses, 2);
        }

        if (responseBody?.responses === undefined) {
          // @TODO: Handle error here
          return [];
        }
        console.log("PROCESSING DATES BUSY");
        const result = responseBody ? this.processBusyTimes(responseBody.responses) : [];
        console.log({ result }, "================");
        return result;
      })
      .catch((err: unknown) => {
        console.log(err);
        return Promise.reject([]);
      });
  }

  async listCalendars(): Promise<IntegrationCalendar[]> {
    return (await this.auth).getToken().then((accessToken) =>
      fetch("https://graph.microsoft.com/v1.0/me/calendars", {
        method: "get",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json",
        },
      })
        .then(handleErrorsJson)
        .then((responseBody: { value: OfficeCalendar[] }) => {
          return responseBody.value.map((cal) => {
            const calendar: IntegrationCalendar = {
              externalId: cal.id ?? "No Id",
              integration: this.integrationName,
              name: cal.name ?? "No calendar name",
              primary: cal.isDefaultCalendar ?? false,
              readOnly: !cal.canEdit && true,
            };
            return calendar;
          });
        })
    );
  }

  private o365Auth = async (credential: Credential) => {
    const appKeys = await getAppKeysFromSlug("office365-calendar");
    if (typeof appKeys.client_id === "string") client_id = appKeys.client_id;
    if (typeof appKeys.client_secret === "string") client_secret = appKeys.client_secret;
    if (!client_id) throw new HttpError({ statusCode: 400, message: "office365 client_id missing." });
    if (!client_secret) throw new HttpError({ statusCode: 400, message: "office365 client_secret missing." });

    const isExpired = (expiryDate: number) => expiryDate < Math.round(+new Date() / 1000);

    const o365AuthCredentials = credential.key as O365AuthCredentials;

    const refreshAccessToken = async (refreshToken: string) => {
      const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          scope: "User.Read Calendars.Read Calendars.ReadWrite",
          client_id,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
          client_secret,
        }),
      });
      const responseBody = await handleErrorsJson(response);
      o365AuthCredentials.access_token = responseBody.access_token;
      o365AuthCredentials.expiry_date = Math.round(+new Date() / 1000 + responseBody.expires_in);
      await prisma.credential.update({
        where: {
          id: credential.id,
        },
        data: {
          key: o365AuthCredentials,
        },
      });
      return o365AuthCredentials.access_token;
    };

    return {
      getToken: () =>
        !isExpired(o365AuthCredentials.expiry_date)
          ? Promise.resolve(o365AuthCredentials.access_token)
          : refreshAccessToken(o365AuthCredentials.refresh_token),
    };
  };

  private translateEvent = (event: CalendarEvent) => {
    return {
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
      attendees: event.attendees.map((attendee) => ({
        emailAddress: {
          address: attendee.email,
          name: attendee.name,
        },
        type: "required",
      })),
      location: event.location ? { displayName: getLocation(event) } : undefined,
    };
  };

  private callWithRetry = async (
    originalRequests: IRequest[],
    settledPromises: ISettledResponse[],
    maxRetries: number,
    retryCount = 0
  ) => {
    console.log("I SHOULD NOT ENTER HERE BECAUSE ARRAY IS NOT HARDCODED");
    let retryAfterTimeout = 0;
    if (retryCount >= maxRetries) {
      return { responses: settledPromises };
    }
    const alreadySuccessRequest = settledPromises.filter((settled) => settled.status === 200);
    const failedRequest = settledPromises
      .filter((item) => item.status === 429)
      .map((item) => {
        // Converting seconds to milliseconds
        const newTimeout = Number(item.headers["Retry-After"]) * 1000 || 0;
        retryAfterTimeout = newTimeout > retryAfterTimeout ? newTimeout : retryAfterTimeout;
        return originalRequests[Number(item.id)];
      });

    if (failedRequest.length === 0) {
      return { responses: alreadySuccessRequest };
    }

    // Await certain time from retry-after header
    console.log("1 =========++++++==+++==++===++==+==");
    await new Promise((r) => setTimeout(r, retryAfterTimeout));
    console.log("2 =========++++++==+++==++===++==+==");
    let newResponses = await this.apiGraphBatchCall(failedRequest);

    const retryAfter = !!newResponses?.responses && this.findRetryAfterResponse(newResponses.responses);

    if (retryAfter && newResponses.responses) {
      newResponses = await this.callWithRetry(
        failedRequest,
        newResponses.responses,
        maxRetries,
        retryCount + 1
      );
    }
    return { responses: [...alreadySuccessRequest, ...(newResponses.responses || [])] };
  };

  private apiGraphBatchCall = async (requests: IRequest[]): Promise<{ responses?: ISettledResponse[] }> => {
    const response = await fetch("https://graph.microsoft.com/v1.0/$batch", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + this.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests }),
    });

    return await handleErrorsJson(response);
  };

  private handleTextJsonResponseWithHtmlInBody = (response: string) => {
    const openTag = '"body":<';
    const closeTag = "</html>";
    const htmlBeginning = response.indexOf(openTag) + openTag.length - 1;
    const htmlEnding = response.indexOf(closeTag) + closeTag.length + 2;
    const resultString = `${response.repeat(1).substring(0, htmlBeginning)} ""${response
      .repeat(1)
      .substring(htmlEnding, response.length)}`;

    return JSON.parse(resultString);
  };

  private findRetryAfterResponse = (response: ISettledResponse[]) => {
    const foundRetry = response.find((request: ISettledResponse) => request.status === 429);
    return !!foundRetry;
  };

  private processBusyTimes = (responses: ISettledResponse[]) => {
    return responses.reduce(
      (acc: BufferedBusyTime[], subResponse: { body: { value?: any[]; error?: any[] } }) => {
        console.log({ subResponse });

        return acc.concat(
          subResponse.body?.value
            ? subResponse.body.value
                .filter((evt) => evt.showAs !== "free" && evt.showAs !== "workingElsewhere")
                .map((evt) => {
                  return {
                    start: evt.start.dateTime + "Z",
                    end: evt.end.dateTime + "Z",
                  };
                })
            : []
        );
      },
      []
    );
  };
}
