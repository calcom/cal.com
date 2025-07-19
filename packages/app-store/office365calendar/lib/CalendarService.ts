import type { Calendar as OfficeCalendar, User, Event } from "@microsoft/microsoft-graph-types-beta";
import type { DefaultBodyType } from "msw";

import dayjs from "@calcom/dayjs";
import { CalendarCache } from "@calcom/features/calendar-cache/calendar-cache";
import type { FreeBusyArgs } from "@calcom/features/calendar-cache/calendar-cache.repository.interface";
import { getTimeMax, getTimeMin } from "@calcom/features/calendar-cache/lib/datesForCache";
import { getLocation } from "@calcom/lib/CalEventParser";
import {
  CalendarAppDelegationCredentialInvalidGrantError,
  CalendarAppDelegationCredentialConfigurationError,
} from "@calcom/lib/CalendarAppError";
import { handleErrorsJson, handleErrorsRaw } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { BufferedBusyTime } from "@calcom/types/BufferedBusyTime";
import type {
  Calendar,
  CalendarServiceEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
  SelectedCalendarEventTypeIds,
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
      const eventsUrl = mainHostDestinationCalendar?.externalId
        ? `${await this.getUserEndpoint()}/calendars/${mainHostDestinationCalendar?.externalId}/events`
        : `${await this.getUserEndpoint()}/calendar/events`;

      const response = await this.fetcher(eventsUrl, {
        method: "POST",
        body: JSON.stringify(this.translateEvent(event)),
      });

      const responseJson = await handleErrorsJson<NewCalendarEventType & { iCalUId: string }>(response);

      return { ...responseJson, iCalUID: responseJson.iCalUId };
    } catch (error) {
      this.log.error(error);

      throw error;
    }
  }

  async updateEvent(uid: string, event: CalendarServiceEvent): Promise<NewCalendarEventType> {
    try {
      const response = await this.fetcher(`${await this.getUserEndpoint()}/calendar/events/${uid}`, {
        method: "PATCH",
        body: JSON.stringify(this.translateEvent(event)),
      });

      const responseJson = await handleErrorsJson<NewCalendarEventType & { iCalUId: string }>(response);

      return { ...responseJson, iCalUID: responseJson.iCalUId };
    } catch (error) {
      this.log.error(error);

      throw error;
    }
  }

  async deleteEvent(uid: string): Promise<void> {
    try {
      const response = await this.fetcher(`${await this.getUserEndpoint()}/calendar/events/${uid}`, {
        method: "DELETE",
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
    selectedCalendars: IntegrationCalendar[],
    shouldServeCache?: boolean
  ): Promise<EventBusyDate[]> {
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

      if (shouldServeCache !== false && ids.length > 0) {
        const timeMin = getTimeMin(dateFrom);
        const timeMax = getTimeMax(dateTo);

        const items = ids.map((id) => ({ id }));

        return await this.getCacheOrFetchAvailability({
          timeMin,
          timeMax,
          items,
        });
      }

      const items = ids.map((id) => ({ id }));
      const bufferedBusyTimes = await this.fetchAvailability({
        timeMin: dateFrom,
        timeMax: dateTo,
        items,
      });

      return bufferedBusyTimes.map((busyTime) => ({
        start: busyTime.start,
        end: busyTime.end,
        source: this.integrationName,
      }));
    } catch (error) {
      this.log.error("Error fetching Office365 availability", { error });
      throw error;
    }
  }

  /**
   * Fetch availability directly from Office365 API
   */
  async fetchAvailability(args: FreeBusyArgs): Promise<BufferedBusyTime[]> {
    const { timeMin, timeMax, items } = args;

    const dateFromParsed = new Date(timeMin);
    const dateToParsed = new Date(timeMax);

    const filter = `?startDateTime=${encodeURIComponent(
      dateFromParsed.toISOString()
    )}&endDateTime=${encodeURIComponent(dateToParsed.toISOString())}`;

    const calendarSelectParams = "$select=showAs,start,end";

    try {
      const ids = items.map((item) => item.id);

      if (ids.length === 0) {
        return [];
      }

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
    } catch (error) {
      this.log.error("Error fetching Office365 availability", { error });
      throw error;
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
      response.json().then((data) => this.log.debug("Response data", safeStringify(data)));
      throw Error(response.statusText);
    }

    return response.json();
  };

  async watchCalendar({
    calendarId,
    eventTypeIds,
  }: {
    calendarId: string;
    eventTypeIds: SelectedCalendarEventTypeIds;
  }) {
    if (!process.env.OFFICE365_WEBHOOK_CLIENT_STATE) {
      this.log.warn("OFFICE365_WEBHOOK_CLIENT_STATE is not set, skipping watching calendar");
      return;
    }

    const allCalendarsWithSubscription = await SelectedCalendarRepository.findMany({
      where: {
        credentialId: this.credential.id,
        externalId: calendarId,
        integration: this.integrationName,
        office365SubscriptionId: {
          not: null,
        },
      },
    });

    const otherCalendarsWithSameSubscription = allCalendarsWithSubscription.filter((cal) => {
      if (!cal.eventTypeId && eventTypeIds.includes(null)) {
        return false;
      }
      return !eventTypeIds.includes(cal.eventTypeId);
    });

    if (otherCalendarsWithSameSubscription.length > 0) {
      const existingSubscription = otherCalendarsWithSameSubscription[0];
      this.log.debug("Reusing existing Office365 subscription", {
        subscriptionId: existingSubscription.office365SubscriptionId,
        calendarId,
      });

      await this.upsertSelectedCalendarsForEventTypeIds(
        {
          externalId: calendarId,
          office365SubscriptionId: existingSubscription.office365SubscriptionId,
          office365SubscriptionExpiration: existingSubscription.office365SubscriptionExpiration,
          office365SubscriptionClientState: existingSubscription.office365SubscriptionClientState,
        },
        eventTypeIds
      );

      return {
        id: existingSubscription.office365SubscriptionId,
        expirationDateTime: existingSubscription.office365SubscriptionExpiration?.toISOString(),
        clientState: existingSubscription.office365SubscriptionClientState,
      };
    }

    try {
      const userEndpoint = await this.getUserEndpoint();
      const changeType = ["created", "updated", "deleted"].join(",");
      const notificationUrl = `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/integrations/office365calendar/webhook`;
      const resource = `${userEndpoint}/calendars/${calendarId}/events`;
      const expirationDateTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 Days
      const clientState = process.env.OFFICE365_WEBHOOK_CLIENT_STATE;

      const subscriptionPayload = {
        changeType,
        notificationUrl,
        resource,
        expirationDateTime,
        clientState,
      };

      const response = await this.fetcher(`/subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscriptionPayload),
      });

      if (!response.ok || response.statusText !== "Created") {
        const errorText = await response.text();
        this.log.error("Subscription creation failed", { status: response.status, errorText });
        throw new Error(`Failed to create subscription: ${response.status} ${errorText}`);
      }

      const subscription = (await response.json()) as {
        id: string;
        expirationDateTime: string;
        clientState: string;
      };

      await this.upsertSelectedCalendarsForEventTypeIds(
        {
          externalId: calendarId,
          office365SubscriptionId: subscription.id,
          office365SubscriptionExpiration: new Date(subscription.expirationDateTime),
          office365SubscriptionClientState: subscription.clientState,
        },
        eventTypeIds
      );

      this.log.debug("Successfully created Office365 subscription", {
        subscriptionId: subscription.id,
        calendarId,
        expiresAt: subscription.expirationDateTime,
      });

      // Check if this is a new subscription (not a renewal)
      const isNewSubscription =
        otherCalendarsWithSameSubscription.length === 0 &&
        !allCalendarsWithSubscription.some((cal) => cal.office365SubscriptionId);

      if (isNewSubscription) {
        await this.populateInitialCacheForNewSubscription(calendarId, eventTypeIds, subscription.id);
      }

      return subscription;
    } catch (error) {
      this.log.error(`Failed to watch calendar ${calendarId}`, safeStringify(error));
      throw error;
    }
  }

  async unwatchCalendar({
    calendarId,
    eventTypeIds,
  }: {
    calendarId: string;
    eventTypeIds: SelectedCalendarEventTypeIds;
  }) {
    const allCalendarsWithSubscription = await SelectedCalendarRepository.findMany({
      where: {
        credentialId: this.credential.id,
        externalId: calendarId,
        integration: this.integrationName,
        office365SubscriptionId: {
          not: null,
        },
      },
    });

    const calendarsToUnwatch = allCalendarsWithSubscription.filter((cal) => {
      return eventTypeIds.includes(cal.eventTypeId);
    });

    if (calendarsToUnwatch.length === 0) {
      this.log.warn("No calendars found to unwatch", { calendarId, eventTypeIds });
      return;
    }

    const subscriptionId = calendarsToUnwatch[0].office365SubscriptionId;
    if (!subscriptionId) {
      this.log.warn("No subscription ID found", { calendarId });
      return;
    }

    const allCalendarsWithSameSubscription = await SelectedCalendarRepository.findMany({
      where: {
        credentialId: this.credential.id,
        externalId: calendarId,
        integration: this.integrationName,
        office365SubscriptionId: subscriptionId,
      },
    });

    const otherCalendarsWithSameSubscription = allCalendarsWithSameSubscription.filter(
      (sc) => !eventTypeIds.includes(sc.eventTypeId)
    );

    if (otherCalendarsWithSameSubscription.length > 0) {
      // Just clear the subscription info for these specific calendars using upsertSelectedCalendarsForEventTypeIds
      await this.upsertSelectedCalendarsForEventTypeIds(
        {
          externalId: calendarId,
          office365SubscriptionId: null,
          office365SubscriptionExpiration: null,
          office365SubscriptionClientState: null,
        },
        eventTypeIds
      );

      return;
    }

    // Delete the subscription from Microsoft Graph
    try {
      const response = await this.fetcher(`/subscriptions/${subscriptionId}`, {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete subscription: ${response.statusText}`);
      }

      this.log.debug("Successfully deleted Office365 subscription", { subscriptionId, calendarId });

      await prisma.calendarCache.deleteMany({
        where: {
          credentialId: this.credential.id,
          key: {
            contains: calendarId,
          },
        },
      });

      const allCalendarsWithSubscription = await SelectedCalendarRepository.findMany({
        where: {
          credentialId: this.credential.id,
          externalId: calendarId,
          integration: this.integrationName,
          office365SubscriptionId: subscriptionId,
        },
      });

      const allEventTypeIds = allCalendarsWithSubscription.map((cal) => cal.eventTypeId);

      await this.upsertSelectedCalendarsForEventTypeIds(
        {
          externalId: calendarId,
          office365SubscriptionId: null,
          office365SubscriptionExpiration: null,
          office365SubscriptionClientState: null,
        },
        allEventTypeIds
      );
    } catch (error) {
      this.log.error(`Failed to unwatch calendar ${calendarId}`, safeStringify(error));
      throw error;
    }
  }

  /**
   * Get availability from cache or fetch from Office365 if cache miss
   * This method is used when calendar-cache feature is enabled
   */
  async getFreeBusyResult(args: FreeBusyArgs, shouldServeCache = true): Promise<BufferedBusyTime[]> {
    const { timeMin, timeMax, items } = args;

    // If cache is disabled, fetch directly from Office365
    if (!shouldServeCache) {
      return this.fetchAvailability({ timeMin, timeMax, items });
    }

    const calendarCache = await CalendarCache.init(this);

    // Try to get from cache first
    const cachedAvailability = await calendarCache.getCachedAvailability({
      args: {
        items,
        // Expand the start date to the start of the month to increase cache hits
        timeMin: getTimeMin(timeMin),
        // Expand the end date to the end of the month to increase cache hits
        timeMax: getTimeMax(timeMax),
      },
      // For delegation scenarios, use userId instead of credentialId
      credentialId: this.credential.id,
      userId: this.credential.delegatedTo ? this.credential.userId : null,
    });

    if (cachedAvailability?.value) {
      this.log.debug("[Cache Hit] Returning cached availability result");
      // Parse the cached value which is stored as JSON
      const parsedValue = cachedAvailability.value as unknown as BufferedBusyTime[];
      return parsedValue;
    }

    // Cache miss - fetch from Office365
    this.log.debug("[Cache Miss] Proceeding with Office365 API call");

    const availability = await this.fetchAvailability({ timeMin, timeMax, items });

    return availability;
  }

  async getCacheOrFetchAvailability(args: FreeBusyArgs): Promise<EventBusyDate[]> {
    const bufferedBusyTimes = await this.getFreeBusyResult(args);

    return bufferedBusyTimes.map((busyTime) => ({
      start: busyTime.start,
      end: busyTime.end,
      source: this.integrationName,
    }));
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
        delegationCredentialId: this.credential.delegatedToId ?? null,
        userId: this.credential.userId,
      },
      eventTypeIds,
    });
  }

  /**
   * Populates initial cache when a new Office365 subscription is successfully created
   * This is necessary because unlike Google, Office365 doesn't send an initial sync webhook
   */
  private async populateInitialCacheForNewSubscription(
    calendarId: string,
    eventTypeIds: SelectedCalendarEventTypeIds,
    subscriptionId: string
  ) {
    try {
      const allCalendars = await SelectedCalendarRepository.findMany({
        where: {
          credentialId: this.credential.id,
          externalId: calendarId,
          integration: this.integrationName,
        },
      });

      const calendarsToCache = allCalendars.filter((cal) => {
        return eventTypeIds.includes(cal.eventTypeId);
      });

      await this.fetchAvailabilityAndSetCache(calendarsToCache);
    } catch (cacheError) {
      this.log.error("Failed to populate initial cache", {
        error: cacheError,
        subscriptionId,
        calendarId,
      });
    }
  }

  async fetchAvailabilityAndSetCache(selectedCalendars: IntegrationCalendar[]) {
    try {
      const selectedCalendarsPerEventType = new Map<
        SelectedCalendarEventTypeIds[number],
        IntegrationCalendar[]
      >();

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
          /** Expand the start date to the start of the month to increase cache hits */
          timeMin: getTimeMin(),
          /** Expand the end date to the end of the month to increase cache hits */
          timeMax: getTimeMax(),
          // Dont use eventTypeId in key because it can be used by any eventType
          items: selectedCalendars.map((sc) => ({ id: sc.externalId })),
        };

        const data = await this.fetchAvailability(parsedArgs);

        const calendarCache = await CalendarCache.init(this);

        const cacheData = {
          credentialId: this.credential.id,
          userId: this.credential.userId,
          args: parsedArgs,
          value: JSON.parse(JSON.stringify(data)),
        };

        await calendarCache.upsertCachedAvailability(cacheData);
      }
    } catch (error) {
      this.log.error("fetchAvailabilityAndSetCache error", safeStringify({ error }));
      throw error;
    }
  }
}
