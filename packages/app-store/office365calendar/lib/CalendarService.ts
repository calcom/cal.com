import { buildRRFromRE } from "@calid/features/modules/teams/lib/recurrenceUtil";
import type {
  Calendar as OfficeCalendar,
  User,
  Event,
  PatternedRecurrence,
  RecurrencePatternType,
  DayOfWeek,
  WeekIndex,
} from "@microsoft/microsoft-graph-types-beta";
import type { DefaultBodyType } from "msw";

import dayjs from "@calcom/dayjs";
import { getLocation } from "@calcom/lib/CalEventParser";
import {
  CalendarAppDelegationCredentialInvalidGrantError,
  CalendarAppDelegationCredentialConfigurationError,
} from "@calcom/lib/CalendarAppError";
import { handleErrorsJson, handleErrorsRaw } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import type { BufferedBusyTime } from "@calcom/types/BufferedBusyTime";
import type {
  Calendar,
  CalendarServiceEvent,
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
  RecurringEvent,
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
    "Retry-After": string;
    "Content-Type": string;
  };
  body: Record<string, DefaultBodyType>;
}

interface IBatchResponse {
  responses: ISettledResponse[];
}
interface BodyValue {
  showAs: string;
  end: { dateTime: string };
  evt: { showAs: string };
  start: { dateTime: string };
}

export default class Office365CalendarService implements Calendar {
  private url = "";
  private integrationName = "";
  private log: typeof logger;
  private auth: OAuthManager;
  private apiGraphUrl = "https://graph.microsoft.com/v1.0";
  private credential: CredentialForCalendarServiceWithTenantId;
  private azureUserId?: string;

  constructor(credential: CredentialForCalendarServiceWithTenantId) {
    this.integrationName = "office365_calendar";
    const tokenResponse = getTokenObjectFromCredential(credential);
    this.auth = new OAuthManager({
      credentialSyncVariables: oAuthManagerHelper.credentialSyncVariables,
      resourceOwner: {
        type: "user",
        id: credential.userId,
      },
      appSlug: metadata.slug,
      currentTokenObject: tokenResponse,
      fetchNewTokenObject: async ({ refreshToken }: { refreshToken: string | null }) => {
        const isDelegated = Boolean(credential?.delegatedTo);

        if (!isDelegated && !refreshToken) {
          return null;
        }

        const { client_id, client_secret } = await this.getAuthCredentials(isDelegated);

        const url = this.getAuthUrl(isDelegated, credential?.delegatedTo?.serviceAccountKey?.tenant_id);

        const bodyParams = {
          scope: isDelegated
            ? "https://graph.microsoft.com/.default"
            : "User.Read Calendars.Read Calendars.ReadWrite",
          client_id,
          client_secret,
          grant_type: isDelegated ? "client_credentials" : "refresh_token",
          ...(isDelegated ? {} : { refresh_token: refreshToken ?? "" }),
        };

        return fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(bodyParams),
        });
      },
      isTokenObjectUnusable: async function () {
        // TODO: Implement this. As current implementation of CalendarService doesn't handle it. It hasn't been handled in the OAuthManager implementation as well.
        // This is a placeholder for future implementation.
        return null;
      },
      isAccessTokenUnusable: async function () {
        // TODO: Implement this
        return null;
      },

      invalidateTokenObject: () => oAuthManagerHelper.invalidateCredential(credential.id),
      expireAccessToken: () => oAuthManagerHelper.markTokenAsExpired(credential),
      updateTokenObject: (tokenObject) => {
        if (!Boolean(credential.delegatedTo)) {
          return oAuthManagerHelper.updateTokenObject({ tokenObject, credentialId: credential.id });
        }
        return Promise.resolve();
      },
    });
    this.credential = credential;
    this.log = logger.getSubLogger({ prefix: [`[[lib] ${this.integrationName}`] });
  }

  private getAuthUrl(delegatedTo: boolean, tenantId?: string): string {
    if (delegatedTo) {
      if (!tenantId) {
        throw new CalendarAppDelegationCredentialInvalidGrantError(
          "Invalid DelegationCredential Settings: tenantId is missing"
        );
      }
      return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    }

    return "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  }

  private async getAuthCredentials(isDelegated: boolean) {
    if (isDelegated) {
      const client_id = this.credential?.delegatedTo?.serviceAccountKey?.client_id;
      const client_secret = this.credential?.delegatedTo?.serviceAccountKey?.private_key;

      if (!client_id || !client_secret) {
        throw new CalendarAppDelegationCredentialConfigurationError(
          "Delegation credential without clientId or Secret"
        );
      }

      return { client_id, client_secret };
    }

    return getOfficeAppKeys();
  }

  private async getAzureUserId(credential: CredentialForCalendarServiceWithTenantId) {
    if (this.azureUserId) return this.azureUserId;

    const isDelegated = Boolean(credential?.delegatedTo);

    if (!isDelegated) return;

    const url = this.getAuthUrl(isDelegated, credential?.delegatedTo?.serviceAccountKey?.tenant_id);

    const delegationCredentialClientId = credential.delegatedTo?.serviceAccountKey?.client_id;
    const delegationCredentialClientSecret = credential.delegatedTo?.serviceAccountKey?.private_key;

    if (!delegationCredentialClientId || !delegationCredentialClientSecret) {
      throw new CalendarAppDelegationCredentialConfigurationError(
        "Delegation credential without clientId or Secret"
      );
    }
    const loginResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        scope: "https://graph.microsoft.com/.default",
        client_id: delegationCredentialClientId,
        grant_type: "client_credentials",
        client_secret: delegationCredentialClientSecret,
      }),
    });

    if (!this.azureUserId && credential?.delegatedTo) {
      const clonedResponse = loginResponse.clone();
      const parsedLoginResponse = await clonedResponse.json();
      const token = parsedLoginResponse?.access_token;
      const oauthClientIdAliasRegex = /\+[a-zA-Z0-9]{25}/;
      const email = this.credential?.user?.email.replace(oauthClientIdAliasRegex, "");
      const encodedFilter = encodeURIComponent(`mail eq '${email}'`);
      const queryParams = `$filter=${encodedFilter}`;

      const response = await fetch(`https://graph.microsoft.com/v1.0/users?${queryParams}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${token}`,
        },
      });

      const parsedBody = await response.json();

      if (!parsedBody?.value?.[0]?.id) {
        throw new CalendarAppDelegationCredentialInvalidGrantError(
          "User might not exist in Microsoft Azure Active Directory"
        );
      }
      this.azureUserId = parsedBody.value[0].id;
    }
    return this.azureUserId;
  }

  // It would error if the delegation credential is not set up correctly
  async testDelegationCredentialSetup(): Promise<boolean> {
    const delegationCredentialClientId = this.credential.delegatedTo?.serviceAccountKey?.client_id;
    const delegationCredentialClientSecret = this.credential.delegatedTo?.serviceAccountKey?.private_key;
    const url = this.getAuthUrl(
      Boolean(this.credential?.delegatedTo),
      this.credential?.delegatedTo?.serviceAccountKey?.tenant_id
    );

    if (!delegationCredentialClientId || !delegationCredentialClientSecret) {
      return false;
    }
    const loginResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        scope: "https://graph.microsoft.com/.default",
        client_id: delegationCredentialClientId,
        grant_type: "client_credentials",
        client_secret: delegationCredentialClientSecret,
      }),
    });
    const parsedLoginResponse = await loginResponse.json();
    return Boolean(parsedLoginResponse?.access_token);
  }

  async getUserEndpoint(): Promise<string> {
    const azureUserId = await this.getAzureUserId(this.credential);
    return azureUserId ? `/users/${this.azureUserId}` : "/me";
  }

  async createEvent(event: CalendarServiceEvent, credentialId: number): Promise<NewCalendarEventType> {
    const mainHostDestinationCalendar = event.destinationCalendar
      ? event.destinationCalendar.find((cal) => cal.credentialId === credentialId) ??
        event.destinationCalendar[0]
      : undefined;

    try {
      this.log.debug("Creating event", {
        hasRecurringEvent: !!event.recurringEvent,
        hasExistingRecurringEvent: !!event.existingRecurringEvent,
      });

      // Handle existing recurring event (booking into an existing series)
      if (event.existingRecurringEvent && mainHostDestinationCalendar) {
        this.log.info("Booking into existing recurring event series", {
          recurringEventId: event.existingRecurringEvent.recurringEventId,
          startTime: event.startTime,
        });

        return await this.createRecurringInstanceEvent(
          event,
          credentialId,
          event.existingRecurringEvent.recurringEventId,
          mainHostDestinationCalendar
        );
      }

      const eventsUrl = mainHostDestinationCalendar?.externalId
        ? `${await this.getUserEndpoint()}/calendars/${mainHostDestinationCalendar?.externalId}/events`
        : `${await this.getUserEndpoint()}/calendar/events`;

      const translatedEvent = this.translateEvent(event);

      // Add recurrence if this is a recurring event
      if (event.recurringEvent) {
        this.log.info("Creating new recurring event series", {
          freq: event.recurringEvent.freq,
          interval: event.recurringEvent.interval,
          count: event.recurringEvent.count,
        });

        translatedEvent.recurrence = this.mapRecurrenceToOutlookFormat(event.recurringEvent);
      }

      const response = await this.fetcher(eventsUrl, {
        method: "POST",
        body: JSON.stringify(translatedEvent),
      });

      const responseJson = await handleErrorsJson<
        NewCalendarEventType & { iCalUId: string; seriesMasterId?: string }
      >(response);

      this.log.info("Event created successfully", {
        id: responseJson.id,
        isRecurring: !!event.recurringEvent,
        seriesMasterId: responseJson.seriesMasterId,
      });

      return {
        ...responseJson,
        iCalUID: responseJson.iCalUId,
        // For recurring events, the seriesMasterId is the recurring event ID
        ...(event.recurringEvent && { thirdPartyRecurringEventId: responseJson.id }),
      };
    } catch (error) {
      this.log.error("Error creating event", { error, event });
      throw error;
    }
  }

  async updateEvent(
    uid: string,
    event: CalendarServiceEvent,
    externalCalendarId?: string | null,
    isRecurringInstanceReschedule?: boolean
  ): Promise<NewCalendarEventType> {
    try {
      this.log.debug("Updating event", {
        uid,
        isRecurringInstanceReschedule,
        hasRescheduleInstance: !!event.rescheduleInstance,
      });

      // Handle recurring instance reschedule
      if (isRecurringInstanceReschedule && event.rescheduleInstance) {
        this.log.info("Detected recurring instance reschedule request", {
          uid,
          formerTime: event.rescheduleInstance.formerTime,
          newTime: event.rescheduleInstance.newTime,
        });

        return await this.updateSpecificRecurringInstance(uid, event);
      }

      // Normal event update logic
      const response = await this.fetcher(`${await this.getUserEndpoint()}/calendar/events/${uid}`, {
        method: "PATCH",
        body: JSON.stringify(this.translateEvent(event)),
      });

      const responseJson = await handleErrorsJson<NewCalendarEventType & { iCalUId: string }>(response);

      this.log.debug("Event updated successfully", { uid });

      return { ...responseJson, iCalUID: responseJson.iCalUId };
    } catch (error) {
      this.log.error("Error updating event", { error, uid });
      throw error;
    }
  }

  async deleteEvent(
    uid: string,
    event?: CalendarEvent,
    externalCalendarId?: string | null,
    isRecurringInstanceCancellation?: boolean
  ): Promise<void> {
    try {
      this.log.info("deleteEvent called", {
        uid,
        isRecurringInstanceCancellation,
        cancelledDatesCount: event?.cancelledDates?.length || 0,
      });

      // Handle instance-level cancellation
      if (isRecurringInstanceCancellation && event?.cancelledDates && event.cancelledDates.length > 0) {
        this.log.info("Processing instance cancellation", {
          uid,
          cancelledDatesCount: event.cancelledDates.length,
        });

        await this.cancelSpecificInstances(uid, event.cancelledDates);
        return;
      }

      // Handle full event deletion (default behavior)
      this.log.info("Deleting entire event", { uid });

      const response = await this.fetcher(`${await this.getUserEndpoint()}/calendar/events/${uid}`, {
        method: "DELETE",
      });

      handleErrorsRaw(response);

      this.log.info("Event deleted successfully", { uid });
    } catch (error) {
      this.log.error("Error deleting event", { error, uid });
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

    const calendarSelectParams = "$select=showAs,start,end";

    try {
      const selectedCalendarIds = selectedCalendars.reduce((calendarIds, calendar) => {
        if (calendar.integration === this.integrationName && calendar.externalId)
          calendarIds.push(calendar.externalId);

        return calendarIds;
      }, [] as string[]);

      if (selectedCalendarIds.length === 0 && selectedCalendars.length > 0) {
        // Only calendars of other integrations selected
        return Promise.resolve([]);
      }

      const ids = await (selectedCalendarIds.length === 0
        ? this.listCalendars().then((cals) => cals.map((e_2) => e_2.externalId).filter(Boolean) || [])
        : Promise.resolve(selectedCalendarIds));
      const requestsPromises = ids.map(async (calendarId, id) => ({
        id,
        method: "GET",
        url: `${await this.getUserEndpoint()}/calendars/${calendarId}/calendarView${filter}&${calendarSelectParams}`,
      }));
      const requests = await Promise.all(requestsPromises);
      const response = await this.apiGraphBatchCall(requests);
      const responseBody = await this.handleErrorJsonOffice365Calendar(response);
      let responseBatchApi: IBatchResponse = { responses: [] };
      if (typeof responseBody === "string") {
        responseBatchApi = this.handleTextJsonResponseWithHtmlInBody(responseBody);
      }
      let alreadySuccessResponse = [] as ISettledResponse[];

      // Validate if any 429 status Retry-After is present
      const retryAfter =
        !!responseBatchApi?.responses && this.findRetryAfterResponse(responseBatchApi.responses);

      if (retryAfter && responseBatchApi.responses) {
        responseBatchApi = await this.fetchRequestWithRetryAfter(requests, responseBatchApi.responses, 2);
      }

      // Recursively fetch nextLink responses
      alreadySuccessResponse = await this.fetchResponsesWithNextLink(responseBatchApi.responses);

      return alreadySuccessResponse ? this.processBusyTimes(alreadySuccessResponse) : [];
    } catch (err) {
      return Promise.reject([]);
    }
  }

  async listCalendars(): Promise<IntegrationCalendar[]> {
    const officeCalendars: OfficeCalendar[] = [];
    // List calendars from MS are paginated
    let finishedParsingCalendars = false;
    const calendarFilterParam = "$select=id,name,isDefaultCalendar,canEdit";

    // Store @odata.nextLink if in response
    let requestLink = `${await this.getUserEndpoint()}/calendars?${calendarFilterParam}`;

    while (!finishedParsingCalendars) {
      const response = await this.fetcher(requestLink);
      let responseBody = await handleErrorsJson<{ value: OfficeCalendar[]; "@odata.nextLink"?: string }>(
        response
      );
      // If responseBody is valid then parse the JSON text
      if (typeof responseBody === "string") {
        responseBody = JSON.parse(responseBody) as { value: OfficeCalendar[] };
      }

      officeCalendars.push(...responseBody.value);

      if (responseBody["@odata.nextLink"]) {
        requestLink = responseBody["@odata.nextLink"].replace(this.apiGraphUrl, "");
      } else {
        finishedParsingCalendars = true;
      }
    }

    const user = await this.fetcher(`${await this.getUserEndpoint()}`);
    const userResponseBody = await handleErrorsJson<User>(user);
    const email = userResponseBody.mail ?? userResponseBody.userPrincipalName;

    return officeCalendars.map((cal: OfficeCalendar) => {
      const calendar: IntegrationCalendar = {
        externalId: cal.id ?? "No Id",
        integration: this.integrationName,
        name: cal.name ?? "No calendar name",
        primary: cal.isDefaultCalendar ?? false,
        readOnly: !cal.canEdit && true,
        email: email ?? "",
      };
      return calendar;
    });
  }

  private translateEvent = (event: CalendarServiceEvent) => {
    const office365Event: Event = {
      subject: event.title,
      body: {
        contentType: "text",
        content: event.calendarDescription,
      },
      start: {
        dateTime: dayjs(event.startTime).tz(event.organizer.timeZone).format("YYYY-MM-DDTHH:mm:ss"),
        timeZone: event.organizer.timeZone,
      },
      end: {
        dateTime: dayjs(event.endTime).tz(event.organizer.timeZone).format("YYYY-MM-DDTHH:mm:ss"),
        timeZone: event.organizer.timeZone,
      },
      hideAttendees: !event.seatsPerTimeSlot ? false : !event.seatsShowAttendees,
      organizer: {
        emailAddress: {
          address: event.destinationCalendar
            ? event.destinationCalendar.find((cal) => cal.userId === event.organizer.id)?.externalId ??
              event.organizer.email
            : event.organizer.email,
          name: event.organizer.name,
        },
      },
      attendees: [
        ...event.attendees.map((attendee) => ({
          emailAddress: {
            address: attendee.email,
            name: attendee.name,
          },
          type: "required" as const,
        })),
        ...(event.team?.members
          ? event.team?.members
              .filter((member) => member.email !== this.credential.user?.email)
              .map((member) => {
                const destinationCalendar =
                  event.destinationCalendar &&
                  event.destinationCalendar.find((cal) => cal.userId === member.id);
                return {
                  emailAddress: {
                    address: destinationCalendar?.externalId ?? member.email,
                    name: member.name,
                  },
                  type: "required" as const,
                };
              })
          : []),
      ],
      location: event.location ? { displayName: getLocation(event) } : undefined,
    };
    if (event.hideCalendarEventDetails) {
      office365Event.sensitivity = "private";
    }
    return office365Event;
  };

  private fetcher = async (endpoint: string, init?: RequestInit | undefined) => {
    return this.auth.requestRaw({
      url: `${this.apiGraphUrl}${endpoint}`,
      options: {
        method: "get",
        ...init,
      },
    });
  };

  private fetchResponsesWithNextLink = async (
    settledResponses: ISettledResponse[]
  ): Promise<ISettledResponse[]> => {
    const alreadySuccess = [] as ISettledResponse[];
    const newLinkRequest = [] as IRequest[];
    settledResponses?.forEach((response) => {
      if (response.status === 200 && response.body["@odata.nextLink"] === undefined) {
        alreadySuccess.push(response);
      } else {
        const nextLinkUrl = response.body["@odata.nextLink"]
          ? String(response.body["@odata.nextLink"]).replace(this.apiGraphUrl, "")
          : "";
        if (nextLinkUrl) {
          // Saving link for later use
          newLinkRequest.push({
            id: Number(response.id),
            method: "GET",
            url: nextLinkUrl,
          });
        }
        delete response.body["@odata.nextLink"];
        // Pushing success body content
        alreadySuccess.push(response);
      }
    });

    if (newLinkRequest.length === 0) {
      return alreadySuccess;
    }

    const newResponse = await this.apiGraphBatchCall(newLinkRequest);
    let newResponseBody = await handleErrorsJson<IBatchResponse | string>(newResponse);

    if (typeof newResponseBody === "string") {
      newResponseBody = this.handleTextJsonResponseWithHtmlInBody(newResponseBody);
    }

    // Going recursive to fetch next link
    const newSettledResponses = await this.fetchResponsesWithNextLink(newResponseBody.responses);
    return [...alreadySuccess, ...newSettledResponses];
  };

  private fetchRequestWithRetryAfter = async (
    originalRequests: IRequest[],
    settledPromises: ISettledResponse[],
    maxRetries: number,
    retryCount = 0
  ): Promise<IBatchResponse> => {
    const getRandomness = () => Number(Math.random().toFixed(3));
    let retryAfterTimeout = 0;
    if (retryCount >= maxRetries) {
      return { responses: settledPromises };
    }
    const alreadySuccessRequest = [] as ISettledResponse[];
    const failedRequest = [] as IRequest[];
    settledPromises.forEach((item) => {
      if (item.status === 200) {
        alreadySuccessRequest.push(item);
      } else if (item.status === 429) {
        const newTimeout = Number(item.headers["Retry-After"]) * 1000 || 0;
        retryAfterTimeout = newTimeout > retryAfterTimeout ? newTimeout : retryAfterTimeout;
        failedRequest.push(originalRequests[Number(item.id)]);
      }
    });

    if (failedRequest.length === 0) {
      return { responses: alreadySuccessRequest };
    }

    // Await certain time from retry-after header
    await new Promise((r) => setTimeout(r, retryAfterTimeout + getRandomness()));

    const newResponses = await this.apiGraphBatchCall(failedRequest);
    let newResponseBody = await handleErrorsJson<IBatchResponse | string>(newResponses);
    if (typeof newResponseBody === "string") {
      newResponseBody = this.handleTextJsonResponseWithHtmlInBody(newResponseBody);
    }
    const retryAfter = !!newResponseBody?.responses && this.findRetryAfterResponse(newResponseBody.responses);

    if (retryAfter && newResponseBody.responses) {
      newResponseBody = await this.fetchRequestWithRetryAfter(
        failedRequest,
        newResponseBody.responses,
        maxRetries,
        retryCount + 1
      );
    }
    return { responses: [...alreadySuccessRequest, ...(newResponseBody?.responses || [])] };
  };

  private apiGraphBatchCall = async (requests: IRequest[]): Promise<Response> => {
    const response = await this.fetcher(`/$batch`, {
      method: "POST",
      body: JSON.stringify({ requests }),
    });

    return response;
  };

  private handleTextJsonResponseWithHtmlInBody = (response: string): IBatchResponse => {
    try {
      const parsedJson = JSON.parse(response);
      return parsedJson;
    } catch (error) {
      // Looking for html in body
      const openTag = '"body":<';
      const closeTag = "</html>";
      const htmlBeginning = response.indexOf(openTag) + openTag.length - 1;
      const htmlEnding = response.indexOf(closeTag) + closeTag.length + 2;
      const resultString = `${response.repeat(1).substring(0, htmlBeginning)} ""${response
        .repeat(1)
        .substring(htmlEnding, response.length)}`;

      return JSON.parse(resultString);
    }
  };

  private findRetryAfterResponse = (response: ISettledResponse[]) => {
    const foundRetry = response.find((request: ISettledResponse) => request.status === 429);
    return !!foundRetry;
  };

  private processBusyTimes = (responses: ISettledResponse[]) => {
    return responses.reduce(
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

  /**
   * Maps RecurringEvent to Microsoft Graph PatternedRecurrence format
   */
  private mapRecurrenceToOutlookFormat(recurringEvent: RecurringEvent): PatternedRecurrence {
    this.log.debug("Mapping recurring event to Outlook format", { recurringEvent });

    try {
      // Build RRULE string first to parse frequency and other components
      const rruleStrings = buildRRFromRE(recurringEvent);
      const rruleLine = rruleStrings.find((line) => line.startsWith("RRULE:"));

      if (!rruleLine) {
        throw new Error("No RRULE found in recurring event");
      }

      // Parse RRULE into key-value pairs
      const rruleValue = rruleLine.substring(6); // Remove "RRULE:" prefix
      const rruleParts = rruleValue.split(";").reduce((acc, part) => {
        const [key, value] = part.split("=");
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);

      // Map frequency
      const freqMap: Record<string, RecurrencePatternType> = {
        DAILY: "daily",
        WEEKLY: "weekly",
        MONTHLY: "absoluteMonthly",
        YEARLY: "absoluteYearly",
      };

      const pattern: PatternedRecurrence["pattern"] = {
        type: freqMap[rruleParts.FREQ] || ("daily" as RecurrencePatternType),
        interval: parseInt(rruleParts.INTERVAL || "1"),
      };

      // Handle BYDAY (e.g., "MO,WE,FR")
      if (rruleParts.BYDAY) {
        const daysMap: Record<string, DayOfWeek> = {
          MO: "monday",
          TU: "tuesday",
          WE: "wednesday",
          TH: "thursday",
          FR: "friday",
          SA: "saturday",
          SU: "sunday",
        };
        pattern.daysOfWeek = rruleParts.BYDAY.split(",").map((day) => daysMap[day.trim()]);
      }

      // Handle BYMONTHDAY
      if (rruleParts.BYMONTHDAY) {
        pattern.dayOfMonth = parseInt(rruleParts.BYMONTHDAY);
      }

      // Handle BYSETPOS for relative monthly (e.g., "first Monday")
      if (rruleParts.BYSETPOS && rruleParts.BYDAY) {
        pattern.type = "relativeMonthly";
        const indexMap: Record<string, WeekIndex> = {
          "1": "first",
          "2": "second",
          "3": "third",
          "4": "fourth",
          "-1": "last",
        };
        pattern.index = indexMap[rruleParts.BYSETPOS] || "first";
      }

      // Handle BYMONTH
      if (rruleParts.BYMONTH) {
        pattern.month = parseInt(rruleParts.BYMONTH);
      }

      // Build range
      const range: PatternedRecurrence["range"] = {
        type: "noEnd",
        startDate: dayjs(recurringEvent.dtstart || new Date())
          .tz(recurringEvent.tzid || "UTC")
          .format("YYYY-MM-DD"),
      };

      if (rruleParts.COUNT) {
        range.type = "numbered";
        range.numberOfOccurrences = parseInt(rruleParts.COUNT);
      } else if (rruleParts.UNTIL) {
        range.type = "endDate";
        range.endDate = dayjs(rruleParts.UNTIL).format("YYYY-MM-DD");
      }

      const recurrence: PatternedRecurrence = {
        pattern,
        range,
      };

      this.log.debug("Generated Outlook recurrence", { recurrence });
      return recurrence;
    } catch (error) {
      this.log.error("Error building Outlook recurrence from recurring event", { error, recurringEvent });
      throw error;
    }
  }

  /**
   * Cancels specific instances of a recurring event
   * For Outlook, we delete each individual instance
   */
  private async cancelSpecificInstances(uid: string, cancelledDates: string[]): Promise<void> {
    try {
      this.log.debug("Cancelling specific instances", {
        uid,
        cancelledDatesCount: cancelledDates.length,
      });

      // First, check if this is a recurring event
      const eventResponse = await this.fetcher(`${await this.getUserEndpoint()}/events/${uid}`);
      const eventJson = await handleErrorsJson<Event & { seriesMasterId?: string }>(eventResponse);

      if (!eventJson.recurrence && !eventJson.seriesMasterId) {
        this.log.warn("Event is not recurring, deleting entire event instead", { uid });
        await this.deleteEvent(uid);
        return;
      }

      // Determine the master event ID
      const masterEventId = eventJson.seriesMasterId || uid;

      this.log.debug("Fetched master recurring event", {
        masterEventId,
        hasRecurrence: !!eventJson.recurrence,
      });

      // For each cancelled date, find and delete the corresponding instance
      const deletionResults = await Promise.allSettled(
        cancelledDates.map(async (cancelledDate) => {
          const cancelledDateTime = new Date(cancelledDate);

          // Fetch instances around this date
          const searchStart = new Date(cancelledDateTime.getTime() - 24 * 60 * 60 * 1000);
          const searchEnd = new Date(cancelledDateTime.getTime() + 24 * 60 * 60 * 1000);

          const instancesUrl = `${await this.getUserEndpoint()}/events/${masterEventId}/instances`;
          const instancesResponse = await this.fetcher(
            `${instancesUrl}?startDateTime=${searchStart.toISOString()}&endDateTime=${searchEnd.toISOString()}`
          );

          const instancesJson = await handleErrorsJson<{ value: Event[] }>(instancesResponse);

          // Find the matching instance
          const targetInstance = instancesJson.value?.find((instance) => {
            if (!instance.start?.dateTime) return false;

            const cancelledISO = dayjs(cancelledDateTime).utc().format("YYYY-MM-DD");

            // Fallback: match by occurrenceId (super reliable on Outlook)
            if (instance.occurrenceId?.endsWith(cancelledISO)) {
              return true;
            }

            // Extract instance timezone or default to UTC
            const instanceTz = instance.start.timeZone || "UTC";

            // Parse Outlook datetime in its own timezone, then convert to UTC
            const instanceUtc = dayjs.tz(instance.start.dateTime, instanceTz).utc();

            const instanceMs = instanceUtc.valueOf();
            const cancelledMs = dayjs(cancelledDateTime).utc().valueOf();

            // Within 1 minute match
            return Math.abs(instanceMs - cancelledMs) < 60000;
          });

          if (!targetInstance || !targetInstance.id) {
            this.log.warn("Could not find instance to cancel", { cancelledDate });
            return;
          }

          // Delete this specific instance
          this.log.debug("Deleting instance", {
            instanceId: targetInstance.id,
            cancelledDate,
          });

          const deleteResponse = await this.fetcher(
            `${await this.getUserEndpoint()}/events/${targetInstance.id}`,
            {
              method: "DELETE",
            }
          );

          handleErrorsRaw(deleteResponse);

          return { instanceId: targetInstance.id, cancelledDate };
        })
      );

      const successfulDeletions = deletionResults.filter((result) => result.status === "fulfilled").length;
      const failedDeletions = deletionResults.filter((result) => result.status === "rejected");

      this.log.info("Completed instance cancellations", {
        uid: masterEventId,
        totalRequested: cancelledDates.length,
        successful: successfulDeletions,
        failed: failedDeletions.length,
      });

      if (failedDeletions.length > 0) {
        this.log.warn("Some instance cancellations failed", {
          failures: failedDeletions.map((f) => (f as PromiseRejectedResult).reason),
        });
      }
    } catch (error) {
      this.log.error("Error cancelling specific instances", {
        error,
        uid,
        cancelledDatesCount: cancelledDates.length,
      });
      throw error;
    }
  }

  /**
   * Updates a specific recurring instance
   * For Outlook, we need to fetch the instance and update it directly
   */
  private async updateSpecificRecurringInstance(
    uid: string,
    event: CalendarServiceEvent
  ): Promise<NewCalendarEventType> {
    try {
      this.log.info("Updating specific recurring instance", {
        uid,
        formerTime: event.rescheduleInstance?.formerTime,
        newTime: event.rescheduleInstance?.newTime,
      });

      const userEndpoint = await this.getUserEndpoint();

      // Grab event definition for UID to determine if this is master or instance
      const eventResponse = await this.fetcher(`${userEndpoint}/events/${uid}`);
      const eventJson = await handleErrorsJson<Event & { seriesMasterId?: string }>(eventResponse);

      let masterEventId: string;
      let instanceId: string | null = null;

      // If UID itself is an instance
      if (eventJson.seriesMasterId) {
        masterEventId = eventJson.seriesMasterId;
        instanceId = uid;
      } else if (eventJson.recurrence) {
        // UID is the master event, we must locate the target instance
        masterEventId = uid;

        const formerTime = dayjs(event.rescheduleInstance!.formerTime);
        const searchStart = formerTime.subtract(1, "day").toISOString();
        const searchEnd = formerTime.add(1, "day").toISOString();

        const instancesUrl = `${userEndpoint}/events/${masterEventId}/instances`;
        const instancesResponse = await this.fetcher(
          `${instancesUrl}?startDateTime=${searchStart}&endDateTime=${searchEnd}`
        );

        const instancesJson = await handleErrorsJson<{ value: Event[] }>(instancesResponse);

        // Attempt match by occurrenceId first (most reliable for Outlook)
        const formerISODate = formerTime.utc().format("YYYY-MM-DD");

        let targetInstance =
          instancesJson.value?.find((inst) => inst.occurrenceId?.endsWith(formerISODate)) ?? null;

        // If not found, fallback to timestamp diff
        if (!targetInstance) {
          targetInstance =
            instancesJson.value?.find((instance) => {
              if (!instance.start?.dateTime) return false;

              const instanceTz = instance.start.timeZone || "UTC";
              const instanceUtc = dayjs.tz(instance.start.dateTime, instanceTz).utc();
              const diff = Math.abs(instanceUtc.valueOf() - formerTime.utc().valueOf());
              return diff < 60000; // within 1 min
            }) ?? null;
        }

        if (!targetInstance?.id) {
          throw new Error(
            `Could not find instance at ${event.rescheduleInstance!.formerTime} in series ${masterEventId}`
          );
        }

        instanceId = targetInstance.id;
      } else {
        // Not a recurring event, fallback to normal update
        this.log.warn("Event is not recurring, performing normal update", { uid });
        return await this.updateEvent(uid, event);
      }

      if (!instanceId) {
        throw new Error("Could not determine instance ID for reschedule");
      }

      this.log.debug("Updating recurring instance", {
        masterEventId,
        instanceId,
      });

      const updateUrl = `${userEndpoint}/events/${instanceId}`;
      const translatedEvent = this.translateEvent(event);

      const response = await this.fetcher(updateUrl, {
        method: "PATCH",
        body: JSON.stringify(translatedEvent),
      });

      const responseJson = await handleErrorsJson<
        NewCalendarEventType & { iCalUId: string; seriesMasterId?: string }
      >(response);

      this.log.info("Successfully updated recurring instance", {
        instanceId,
        masterEventId,
        newStart: event.startTime,
        newEnd: event.endTime,
      });

      return {
        ...responseJson,
        iCalUID: responseJson.iCalUId,
      };
    } catch (error) {
      this.log.error("Error updating specific recurring instance", {
        error,
        uid,
        formerTime: event.rescheduleInstance?.formerTime,
        newTime: event.rescheduleInstance?.newTime,
      });
      throw error;
    }
  }

  /**
   * Creates an instance event for an existing recurring series
   * This creates an exception in the recurring series
   */
  private async createRecurringInstanceEvent(
    event: CalendarServiceEvent,
    credentialId: number,
    recurringEventId: string,
    mainHostDestinationCalendar?: { externalId: string; credentialId: number }
  ): Promise<NewCalendarEventType> {
    try {
      this.log.debug("Creating recurring instance exception", {
        recurringEventId,
        startTime: event.startTime,
      });

      // First, fetch the specific instance we want to modify
      const instancesUrl = `${await this.getUserEndpoint()}/events/${recurringEventId}/instances`;
      const instancesResponse = await this.fetcher(
        `${instancesUrl}?startDateTime=${new Date(event.startTime).toISOString()}&endDateTime=${new Date(
          event.endTime
        ).toISOString()}`
      );

      const instancesJson = await handleErrorsJson<{ value: Event[] }>(instancesResponse);

      if (!instancesJson.value || instancesJson.value.length === 0) {
        throw new Error("Could not find matching instance in recurring series");
      }

      // Find the exact instance (compare timestamps)
      const targetInstance = instancesJson.value.find((instance) => {
        const instanceStart = new Date(instance.start?.dateTime || "").getTime();
        const eventStart = new Date(event.startTime).getTime();
        return Math.abs(instanceStart - eventStart) < 60000; // Within 1 minute
      });

      if (!targetInstance || !targetInstance.id) {
        this.log.warn("Could not find exact matching instance, using first instance");
        if (!instancesJson.value[0]?.id) {
          throw new Error("No valid instance found");
        }
      }

      const instanceId = targetInstance?.id || instancesJson.value[0].id;

      // Update this specific instance to create an exception
      const updateUrl = `${await this.getUserEndpoint()}/events/${instanceId}`;
      const translatedEvent = this.translateEvent(event);

      this.log.debug("Updating instance to create exception", { instanceId });

      const response = await this.fetcher(updateUrl, {
        method: "PATCH",
        body: JSON.stringify(translatedEvent),
      });

      const responseJson = await handleErrorsJson<
        NewCalendarEventType & { iCalUId: string; seriesMasterId?: string }
      >(response);

      this.log.info("Recurring instance exception created successfully", {
        instanceId: responseJson.id,
        recurringEventId,
      });

      return {
        ...responseJson,
        iCalUID: responseJson.iCalUId,
        thirdPartyRecurringEventId: recurringEventId,
      };
    } catch (error) {
      this.log.error("Error creating recurring instance exception", {
        error,
        recurringEventId,
      });
      throw error;
    }
  }
}
