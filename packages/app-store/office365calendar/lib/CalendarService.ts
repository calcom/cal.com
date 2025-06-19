import type { Calendar as OfficeCalendar, User, Event } from "@microsoft/microsoft-graph-types-beta";
import type { Prisma } from "@prisma/client";
import type { DefaultBodyType } from "msw";

import dayjs from "@calcom/dayjs";
import type { FreeBusyArgs } from "@calcom/features/calendar-cache/calendar-cache.repository.interface";
import { getLocation } from "@calcom/lib/CalEventParser";
import {
  CalendarAppDelegationCredentialInvalidGrantError,
  CalendarAppDelegationCredentialConfigurationError,
} from "@calcom/lib/CalendarAppError";
import { handleErrorsJson, handleErrorsRaw } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
import { prisma } from "@calcom/prisma";
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
import { Office365CalendarCache } from "./Office365CalendarCache";
import { Office365SubscriptionManager } from "./Office365SubscriptionManager";
import { validateOffice365Environment } from "./envValidation";
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
  private cachedUserEndpoint?: string; // Cache for getUserEndpoint result

  constructor(credential: CredentialForCalendarServiceWithTenantId) {
    // Validate environment variables at startup
    const envValidation = validateOffice365Environment();
    if (!envValidation.isValid) {
      throw new Error(
        `Office365 Calendar Service initialization failed. Missing required environment variables: ${envValidation.missingVars.join(
          ", "
        )}`
      );
    }

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

  public getCredential() {
    return this.credential;
  }

  private getSubscriptionManager() {
    return new Office365SubscriptionManager(this);
  }

  private getCalendarCache() {
    return new Office365CalendarCache(this);
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

    if (!isDelegated) {
      const user = await this.fetcher("/me");
      const userResponseBody = await handleErrorsJson<User>(user);
      this.azureUserId = userResponseBody.userPrincipalName ?? undefined;
      if (!this.azureUserId) {
        throw new Error("UserPrincipalName is missing for non-delegated user");
      }
      return this.azureUserId;
    }

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
    // Return cached result if available
    if (this.cachedUserEndpoint) {
      return this.cachedUserEndpoint;
    }

    // Calculate and cache the result
    const azureUserId = await this.getAzureUserId(this.credential);
    this.cachedUserEndpoint = azureUserId ? `/users/${this.azureUserId}` : "/me";

    return this.cachedUserEndpoint;
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
    shouldServeCache?: boolean,
    fallbackToPrimary?: boolean
  ): Promise<EventBusyDate[]> {
    this.log.info("[Office365CalendarService] getAvailability called", {
      dateFrom,
      dateTo,
      selectedCalendars: selectedCalendars.map((cal) => ({
        externalId: cal.externalId,
        integration: cal.integration,
      })),
      shouldServeCache,
      fallbackToPrimary,
    });

    // Get calendar IDs
    const calendarIds = await this.getCalendarIds(selectedCalendars, fallbackToPrimary);

    this.log.info("[Office365CalendarService] Calendar IDs resolved", { calendarIds });

    if (calendarIds.length === 0) {
      this.log.info("[Office365CalendarService] No calendar IDs found, returning empty array");
      return Promise.resolve([]);
    }

    try {
      const startDate = dayjs(dateFrom);
      const endDate = dayjs(dateTo);

      this.log.info("[Office365CalendarService] Calling getChunkedAvailability");
      return await this.getChunkedAvailability(startDate, endDate, calendarIds, shouldServeCache);
    } catch (error) {
      this.log.error("Error getting availability", error);
      return [];
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

  private processBusyTimes = (args: FreeBusyArgs, responses: ISettledResponse[]) => {
    return responses.reduce((acc: EventBusyDate[], response) => {
      if (!response.body?.value || !Array.isArray(response.body.value)) return acc;

      const calendarId = args.items[Number(response.id)].id;
      const busyTimes = response.body.value.reduce((times: EventBusyDate[], evt: BodyValue) => {
        if (evt.showAs === "free" || evt.showAs === "workingElsewhere") return times;

        times.push({
          start: new Date(`${evt.start.dateTime}Z`),
          end: new Date(`${evt.end.dateTime}Z`),
          source: `office365_${calendarId}`,
        });
        return times;
      }, []);

      return [...acc, ...busyTimes];
    }, []);
  };

  private handleErrorJsonOffice365Calendar = <Type>(response: Response): Promise<Type | string> => {
    if (response.headers?.get?.("content-encoding") === "gzip") {
      return response.text();
    }

    if (response.status === 204) {
      return new Promise((resolve) => resolve({} as Type));
    }

    if (!response.ok && (response.status < 200 || response.status >= 300)) {
      // Log error details using proper logger instead of console.log
      response
        .json()
        .then((errorBody) => {
          this.log.error("Office365 API Error", {
            status: response.status,
            statusText: response.statusText,
            // errorBody omitted to avoid logging sensitive information
            url: response.url,
          });
        })
        .catch((parseError) => {
          this.log.error("Failed to parse error response", {
            status: response.status,
            statusText: response.statusText,
            parseError: parseError.message,
            url: response.url,
          });
        });

      throw new Error(`Office365 API Error: ${response.status} ${response.statusText}`);
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
    this.log.debug("watchCalendar", { calendarId, eventTypeIds });

    // First, check if this calendar is already being watched
    const allCalendarsWithSubscription = await SelectedCalendarRepository.findMany({
      where: {
        credentialId: this.credential.id,
        externalId: calendarId,
        integration: this.integrationName,
        outlookSubscriptionId: {
          not: null,
        },
      },
    });

    // Filter out calendars belonging to event types we're currently processing
    const eventTypeIdsArray = eventTypeIds.filter((id) => id !== null) as number[];
    const otherCalendarsWithSameSubscription = allCalendarsWithSubscription.filter(
      (sc) => !eventTypeIdsArray.includes(sc.eventTypeId ?? 0)
    );

    // If we found existing subscriptions, reuse them
    let subscriptionProps = otherCalendarsWithSameSubscription.length
      ? {
          id: otherCalendarsWithSameSubscription[0].outlookSubscriptionId,
          expirationDateTime: otherCalendarsWithSameSubscription[0].outlookSubscriptionExpiration,
        }
      : null;
    let error: string | undefined;

    if (!subscriptionProps) {
      try {
        // No existing subscription found, create a new one
        const subscriptionManager = this.getSubscriptionManager();
        subscriptionProps = await subscriptionManager.createSubscription(calendarId);
      } catch (e) {
        this.log.error(`Failed to watch calendar ${calendarId}`, safeStringify(e));
        // We set error to prevent attempting to watch on next cron run
        error = e instanceof Error ? e.message : "Unknown error";
      }
    } else {
      this.log.info(
        `Calendar ${calendarId} is already being watched for event types ${otherCalendarsWithSameSubscription.map(
          (sc) => sc.eventTypeId
        )}. So, not watching again and instead reusing the existing subscription`
      );
    }

    // Update all selected calendars with subscription info
    await this.upsertSelectedCalendarsForEventTypeIds(
      {
        externalId: calendarId,
        outlookSubscriptionId: subscriptionProps?.id,
        outlookSubscriptionExpiration: subscriptionProps?.expirationDateTime,
        error,
      },
      eventTypeIds
    );

    return subscriptionProps;
  }

  async unwatchCalendar({
    calendarId,
    eventTypeIds,
  }: {
    calendarId: string;
    eventTypeIds: SelectedCalendarEventTypeIds;
  }) {
    this.log.debug("unwatchCalendar", { calendarId, eventTypeIds });

    // Get the selected calendar IDs to be unwatched
    const selectedCalendarIds = eventTypeIds.filter((id) => id !== null) as number[];

    try {
      // Fetch all selected calendars for this credential, calendarId, and integration
      const calendarsWithSameExternalId = await SelectedCalendarRepository.findMany({
        where: {
          credentialId: this.credential.id,
          externalId: calendarId,
          integration: this.integrationName,
        },
      });

      // Of those, which are being watched (have a subscription)?
      const calendarsBeingWatched = calendarsWithSameExternalId.filter((sc) => !!sc.outlookSubscriptionId);

      // Of those, which are NOT being unwatched (i.e., still in use by other event types)?
      const calendarsStillWatched = calendarsBeingWatched.filter(
        (sc) => sc.eventTypeId !== null && !selectedCalendarIds.includes(sc.eventTypeId ?? 0)
      );

      if (calendarsStillWatched.length) {
        this.log.info(
          `There are other ${calendarsStillWatched.length} calendars with the same externalId_credentialId. Not unwatching. Just removing the subscription from this selected calendar`
        );

        await this.upsertSelectedCalendarsForEventTypeIds(
          {
            externalId: calendarId,
            outlookSubscriptionId: null,
            outlookSubscriptionExpiration: null,
          },
          eventTypeIds
        );
        return;
      }

      // If no other event types are using this subscription, delete it from Microsoft
      const allSubscriptionsForThisCalendarBeingUnwatched = calendarsBeingWatched.map((sc) => ({
        subscriptionId: sc.outlookSubscriptionId,
      }));

      // Remove the subscription from Microsoft
      await prisma.calendarCache.deleteMany({ where: { credentialId: this.credential.id } });
      const subscriptionManager = this.getSubscriptionManager();
      for (const { subscriptionId } of allSubscriptionsForThisCalendarBeingUnwatched) {
        if (subscriptionId) {
          await subscriptionManager.deleteSubscription(subscriptionId).catch((error) => {
            this.log.error("Error deleting subscription", {
              error,
              subscriptionId,
            });
          });
        }
      }

      // Remove subscription info from all selected calendars being unwatched
      await this.upsertSelectedCalendarsForEventTypeIds(
        {
          externalId: calendarId,
          outlookSubscriptionId: null,
          outlookSubscriptionExpiration: null,
        },
        eventTypeIds
      );

      // Optionally, refresh cache for remaining calendars for this credential
      const remainingCalendars = calendarsWithSameExternalId.filter(
        (sc) => !selectedCalendarIds.includes(sc.eventTypeId ?? 0)
      );
      if (remainingCalendars.length > 0) {
        await this.fetchAvailabilityAndSetCache(remainingCalendars);
      }
    } catch (error) {
      this.log.error("Error unwatching calendar", { error, calendarId });
      throw error;
    }
  }

  async fetchAvailabilityAndSetCache(selectedCalendars: IntegrationCalendar[]) {
    this.log.debug("fetchAvailabilityAndSetCache", { selectedCalendars });

    try {
      // Filter to only include office365 calendars
      const o365Calendars = selectedCalendars.filter((cal) => cal.integration === this.integrationName);

      if (o365Calendars.length === 0) {
        return;
      }

      const calendarCache = this.getCalendarCache();
      await calendarCache.updateCache(o365Calendars, true);

      this.log.debug("Successfully refreshed availability cache");
    } catch (error) {
      this.log.error("Error updating availability cache", error);
    }
  }

  async fetchAvailability(args: FreeBusyArgs): Promise<EventBusyDate[]> {
    try {
      const dateFromParsed = new Date(args.timeMin);
      const dateToParsed = new Date(args.timeMax);
      const calendarIds = args.items.map((item) => item.id);

      const filter = `?startDateTime=${encodeURIComponent(
        dateFromParsed.toISOString()
      )}&endDateTime=${encodeURIComponent(dateToParsed.toISOString())}`;

      const calendarSelectParams = "$select=showAs,start,end";

      const userEndpoint = await this.getUserEndpoint();
      const requestsPromises = calendarIds.map((calendarId, id) => ({
        id,
        method: "GET",
        url: `${userEndpoint}/calendars/${calendarId}/calendarView${filter}&${calendarSelectParams}`,
      }));

      const requests = await Promise.all(requestsPromises);
      const response = await this.apiGraphBatchCall(requests);
      const responseBody = await this.handleErrorJsonOffice365Calendar(response);

      let responseBatchApi: IBatchResponse = { responses: [] };
      if (typeof responseBody === "string") {
        responseBatchApi = this.handleTextJsonResponseWithHtmlInBody(responseBody);
      }

      // Handle retries and pagination as in your existing code
      let alreadySuccessResponse = [] as ISettledResponse[];
      const retryAfter =
        !!responseBatchApi?.responses && this.findRetryAfterResponse(responseBatchApi.responses);

      if (retryAfter && responseBatchApi.responses) {
        responseBatchApi = await this.fetchRequestWithRetryAfter(
          requestsPromises,
          responseBatchApi.responses,
          2
        );
      }

      // Recursively fetch nextLink responses
      alreadySuccessResponse = await this.fetchResponsesWithNextLink(responseBatchApi.responses);

      // The final processed busy times
      return alreadySuccessResponse ? this.processBusyTimes(args, alreadySuccessResponse) : [];
    } catch (error) {
      this.log.error("Error fetching availability", error);
      throw error;
    }
  }

  async upsertSelectedCalendarsForEventTypeIds(
    data: Omit<Prisma.SelectedCalendarUncheckedCreateInput, "integration" | "credentialId" | "userId">,
    eventTypeIds: SelectedCalendarEventTypeIds
  ) {
    this.log.debug("upsertSelectedCalendarsForEventTypeIds", safeStringify({ data, eventTypeIds }));
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

  private async getCalendarIds(
    selectedCalendars: IntegrationCalendar[],
    fallbackToPrimary?: boolean
  ): Promise<string[]> {
    const ids = selectedCalendars
      .filter((cal) => cal.integration === this.integrationName)
      .map((cal) => cal.externalId)
      .filter(Boolean) as string[];

    if (ids.length > 0) {
      return ids;
    }

    if (fallbackToPrimary) {
      try {
        const primaryCal = await this.listCalendars().then(
          (cals) => cals.find((cal) => cal.primary) || cals[0]
        );
        return primaryCal?.externalId ? [primaryCal.externalId] : [];
      } catch (error) {
        this.log.error("Error getting primary calendar", error);
      }
    }

    return [];
  }

  /**
   * Fetch an event by its UID from Office365
   * @param uid Event UID
   * @returns The event object or null if not found
   */
  public async fetchEventByUid(uid: string): Promise<any | null> {
    try {
      const response = await this.fetcher(`${await this.getUserEndpoint()}/calendar/events/${uid}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      this.log.error("Error fetching event by UID", error);
      return null;
    }
  }

  private async getChunkedAvailability(
    startDate: dayjs.Dayjs,
    endDate: dayjs.Dayjs,
    calendarIds: string[],
    shouldServeCache?: boolean
  ): Promise<EventBusyDate[]> {
    this.log.info("[Office365CalendarService] getChunkedAvailability called", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      calendarIds,
      shouldServeCache,
    });

    const diffInDays = endDate.diff(startDate, "days");
    const calendarCache = this.getCalendarCache();

    this.log.info("[Office365CalendarService] diffInDays and cache instance", {
      diffInDays,
      cacheConstructorName: calendarCache.constructor.name,
    });

    if (diffInDays <= 90) {
      this.log.info("[Office365CalendarService] Single chunk, calling getCacheOrFetchAvailability");
      return calendarCache.getCacheOrFetchAvailability(
        startDate.toISOString(),
        endDate.toISOString(),
        calendarIds,
        shouldServeCache
      );
    }

    const chunks = this.chunkDateRange(startDate.toDate(), endDate.toDate());
    const busyTimes: EventBusyDate[] = [];

    for (const chunk of chunks) {
      try {
        const chunkBusyTimes = await calendarCache.getCacheOrFetchAvailability(
          chunk.start.toISOString(),
          chunk.end.toISOString(),
          calendarIds,
          shouldServeCache
        );
        if (chunkBusyTimes) {
          busyTimes.push(...chunkBusyTimes);
        }
      } catch (error) {
        this.log.error("Error fetching chunk availability", {
          error,
          chunk,
          calendarIds,
        });
        // Continue with next chunk even if one fails
        continue;
      }
    }

    return busyTimes;
  }

  private chunkDateRange(startDate: Date, endDate: Date, chunkSize = 90) {
    const chunks: Array<{ start: Date; end: Date }> = [];
    let currentStart = startDate;

    while (currentStart < endDate) {
      const chunkEnd = new Date(currentStart);
      chunkEnd.setDate(chunkEnd.getDate() + chunkSize);

      chunks.push({
        start: currentStart,
        end: chunkEnd > endDate ? endDate : chunkEnd,
      });

      currentStart = new Date(chunkEnd);
    }

    return chunks;
  }
}
