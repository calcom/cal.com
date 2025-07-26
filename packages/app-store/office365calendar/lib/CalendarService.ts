import type { Calendar as OfficeCalendar, User, Event } from "@microsoft/microsoft-graph-types-beta";
import type { Prisma } from "@prisma/client";
import type { DefaultBodyType } from "msw";

import dayjs from "@calcom/dayjs";
import { CalendarCache } from "@calcom/features/calendar-cache/calendar-cache";
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
  id?: string;
  createdDateTime?: string;
}

export interface EnrichedBufferedBusyTime extends BufferedBusyTime {
  id?: string;
  createdDateTime?: string | Date;
}

const MICROSOFT_WEBHOOK_URL = `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/integrations/office365calendar/webhook`;
export const MICROSOFT_SUBSCRIPTION_TTL = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

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

    const parsedLoginResponse = await loginResponse.json();
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
    this.azureUserId = parsedBody.value[0].userPrincipalName ?? undefined;
    if (!this.azureUserId) {
      throw new CalendarAppDelegationCredentialInvalidGrantError(
        "UserPrincipalName is missing for delegated user"
      );
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
    return azureUserId ? `/users/${azureUserId}` : "/me";
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

  async fetchAvailability(
    dateFrom: string,
    dateTo: string,
    calendarIds: string[],
    getCreatedDateTime = false
  ): Promise<EventBusyDate[]> {
    const dateFromParsed = new Date(dateFrom);
    const dateToParsed = new Date(dateTo);

    const filter = `?startDateTime=${encodeURIComponent(
      dateFromParsed.toISOString()
    )}&endDateTime=${encodeURIComponent(dateToParsed.toISOString())}`;

    const calendarSelectParams = `$select=showAs,start,end${getCreatedDateTime ? ",createdDateTime" : ""}`;

    const userEndpoint = await this.getUserEndpoint();
    const requests = calendarIds.map((calendarId, id) => ({
      id,
      method: "GET",
      url: `${userEndpoint}/calendars/${calendarId}/${
        getCreatedDateTime ? "events" : "calendarView"
      }${filter}&${calendarSelectParams}`,
    }));

    const response = await this.apiGraphBatchCall(requests);
    const responseBody = await this.handleErrorJsonOffice365Calendar(response);
    let responseBatchApi: IBatchResponse = { responses: [] };
    if (typeof responseBody === "string") {
      responseBatchApi = this.handleTextJsonResponseWithHtmlInBody(responseBody);
    }

    let alreadySuccessResponse = [] as ISettledResponse[];
    const retryAfter =
      !!responseBatchApi?.responses && this.findRetryAfterResponse(responseBatchApi.responses);

    if (retryAfter && responseBatchApi.responses) {
      responseBatchApi = await this.fetchRequestWithRetryAfter(requests, responseBatchApi.responses, 2);
    }

    alreadySuccessResponse = await this.fetchResponsesWithNextLink(responseBatchApi.responses);

    return alreadySuccessResponse ? this.processBusyTimes(alreadySuccessResponse) : [];
  }

  async setAvailabilityInCache(
    args: { timeMin: string; timeMax: string; items: { id: string }[] },
    data: EventBusyDate[]
  ): Promise<void> {
    const calendarCache = await CalendarCache.init(null);
    await calendarCache.upsertCachedAvailability({
      credentialId: this.credential.id,
      userId: this.credential.userId,
      args,
      value: JSON.parse(JSON.stringify(data)),
    });
  }

  async getCacheOrFetchAvailability(
    dateFrom: string,
    dateTo: string,
    calendarIds: string[],
    shouldServeCache = true
  ): Promise<EventBusyDate[]> {
    if (!shouldServeCache) {
      return await this.fetchAvailability(dateFrom, dateTo, calendarIds);
    }

    const calendarCache = await CalendarCache.init(null);
    const cacheArgs = {
      timeMin: getTimeMin(dateFrom),
      timeMax: getTimeMax(dateTo),
      items: calendarIds.map((id) => ({ id })),
    };

    const cached = await calendarCache.getCachedAvailability({
      credentialId: this.credential.id,
      userId: this.credential.userId,
      args: cacheArgs,
    });

    if (cached) {
      this.log.debug("[Cache Hit] Returning cached availability", { dateFrom, dateTo, calendarIds });
      return cached.value as EventBusyDate[];
    }

    this.log.debug("[Cache Miss] Fetching availability", { dateFrom, dateTo, calendarIds });
    const data = await this.fetchAvailability(dateFrom, dateTo, calendarIds);
    return data;
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[],
    shouldServeCache = true,
    fallbackToPrimary = true
  ): Promise<EventBusyDate[]> {
    this.log.debug("Getting availability", { dateFrom, dateTo, selectedCalendars });

    const selectedCalendarIds = selectedCalendars.reduce((calendarIds, calendar) => {
      if (calendar.integration === this.integrationName && calendar.externalId)
        calendarIds.push(calendar.externalId);
      return calendarIds;
    }, [] as string[]);
    if (selectedCalendarIds.length === 0 && selectedCalendars.length > 0) {
      // Only calendars of other integrations selected
      return Promise.resolve([]);
    }

    const getCalIds = async () => {
      if (selectedCalendarIds.length !== 0) return selectedCalendarIds;
      const cals = await this.listCalendars();
      if (!cals.length) return [];
      if (!fallbackToPrimary) return cals.map((cal) => cal.externalId).filter(Boolean);

      const primaryCalendar = cals.find((cal) => cal.primary);
      if (!primaryCalendar) return [];
      return [primaryCalendar.externalId];
    };

    try {
      const calendarIds = await getCalIds();
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      const oneDayMs = 1000 * 60 * 60 * 24;
      const diff = Math.floor((fromDate.getTime() - toDate.getTime()) / oneDayMs);

      if (diff <= 90) {
        return await this.getCacheOrFetchAvailability(dateFrom, dateTo, calendarIds, shouldServeCache);
      } else {
        const busyData: EventBusyDate[] = [];
        const loopsNumber = Math.ceil(diff / 90);
        let currentStartTime = fromDate.getTime();
        const originalEndTime = toDate.getTime();
        const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
        const oneMinuteMs = 60 * 1000;

        for (let i = 0; i < loopsNumber; i++) {
          let currentEndTime = currentStartTime + ninetyDaysMs;

          // Don't go beyond the original end date
          if (currentEndTime > originalEndTime) {
            currentEndTime = originalEndTime;
          }

          busyData.push(
            ...(await this.getCacheOrFetchAvailability(
              new Date(currentStartTime).toISOString(),
              new Date(currentEndTime).toISOString(),
              calendarIds,
              shouldServeCache
            ))
          );

          currentStartTime = currentEndTime + oneMinuteMs;
        }
        return busyData;
      }
    } catch (error) {
      this.log.error("Error getting availability", { error, selectedCalendars });
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

  async watchCalendar({
    calendarId,
    eventTypeIds,
  }: {
    calendarId: string;
    eventTypeIds: SelectedCalendarEventTypeIds;
  }) {
    this.log.debug("watchCalendar", { calendarId, eventTypeIds });

    if (!process.env.MICROSOFT_WEBHOOK_TOKEN) {
      this.log.warn("MICROSOFT_WEBHOOK_TOKEN is not set, skipping watching calendar");
      return;
    }

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

    const otherCalendarsWithSameSubscription = allCalendarsWithSubscription.filter(
      (sc) => sc.eventTypeId !== null && !eventTypeIds.includes(sc.eventTypeId)
    );

    let subscriptionProps: { id?: string; expiration?: string; error?: string } =
      otherCalendarsWithSameSubscription.length
        ? {
            id: otherCalendarsWithSameSubscription[0].outlookSubscriptionId ?? undefined,
            expiration: otherCalendarsWithSameSubscription[0].outlookSubscriptionExpiration ?? undefined,
            error: undefined,
          }
        : { error: undefined };

    if (!otherCalendarsWithSameSubscription.length) {
      try {
        subscriptionProps = await this.startWatchingCalendarInMicrosoft({ calendarId });
      } catch (error) {
        this.log.error(`Failed to watch calendar ${calendarId}`, safeStringify(error));
        throw error;
      }
    } else {
      this.log.info(
        `Calendar ${calendarId} is already being watched for event types ${otherCalendarsWithSameSubscription.map(
          (sc) => sc.eventTypeId
        )}. Reusing existing subscription`
      );
    }

    await this.upsertSelectedCalendarsForEventTypeIds(
      {
        externalId: calendarId,
        outlookSubscriptionId: subscriptionProps.id,
        outlookSubscriptionExpiration: subscriptionProps.expiration,
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
    const credentialId = this.credential.id;
    const eventTypeIdsToBeUnwatched = eventTypeIds;

    const calendarsWithSameCredentialId = await SelectedCalendarRepository.findMany({
      where: {
        credentialId,
      },
    });

    const calendarWithSameExternalId = calendarsWithSameCredentialId.filter(
      (sc) => sc.externalId === calendarId && sc.integration === this.integrationName
    );

    const calendarsWithSameExternalIdThatAreBeingWatched = calendarWithSameExternalId.filter(
      (sc) => !!sc.outlookSubscriptionId
    );

    const calendarsWithSameExternalIdToBeStillWatched = calendarsWithSameExternalIdThatAreBeingWatched.filter(
      (sc) => sc.eventTypeId !== null && !eventTypeIdsToBeUnwatched.includes(sc.eventTypeId)
    );

    if (calendarsWithSameExternalIdToBeStillWatched.length) {
      this.log.info(
        `There are other ${calendarsWithSameExternalIdToBeStillWatched.length} calendars with the same externalId_credentialId. Not unwatching. Just removing the subscription from this selected calendar`
      );

      await this.upsertSelectedCalendarsForEventTypeIds(
        {
          externalId: calendarId,
          outlookSubscriptionId: null,
          outlookSubscriptionExpiration: null,
        },
        eventTypeIdsToBeUnwatched
      );
      return;
    }

    const allSubscriptionsForThisCalendarBeingUnwatched = calendarsWithSameExternalIdThatAreBeingWatched.map(
      (sc) => ({
        subscriptionId: sc.outlookSubscriptionId,
      })
    );

    await prisma.calendarCache.deleteMany({ where: { credentialId } });
    await this.stopWatchingCalendarsInMicrosoft(allSubscriptionsForThisCalendarBeingUnwatched);
    await this.upsertSelectedCalendarsForEventTypeIds(
      {
        externalId: calendarId,
        outlookSubscriptionId: null,
        outlookSubscriptionExpiration: null,
      },
      eventTypeIdsToBeUnwatched
    );

    const remainingCalendars =
      calendarsWithSameCredentialId.filter(
        (sc) => sc.externalId !== calendarId && sc.integration === this.integrationName
      ) || [];
    if (remainingCalendars.length > 0) {
      await this.fetchAvailabilityAndSetCache(remainingCalendars);
    }
  }

  private async startWatchingCalendarInMicrosoft({ calendarId }: { calendarId: string }) {
    const userEndpoint = await this.getUserEndpoint();
    const response = await this.fetcher("/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        changeType: "created,updated,deleted",
        notificationUrl: MICROSOFT_WEBHOOK_URL,
        resource: `${userEndpoint}/calendars/${calendarId}/events`,
        expirationDateTime: new Date(Date.now() + MICROSOFT_SUBSCRIPTION_TTL).toISOString(),
        clientState: process.env.MICROSOFT_WEBHOOK_TOKEN,
      }),
    });

    const subscription = await handleErrorsJson<{ id: string; expirationDateTime: string }>(response);
    return {
      id: subscription.id,
      expiration: subscription.expirationDateTime,
    };
  }

  private async stopWatchingCalendarsInMicrosoft(subscriptions: { subscriptionId: string | null }[]) {
    const uniqueSubscriptions = subscriptions.filter(
      (s, i, arr) => s.subscriptionId && arr.findIndex((x) => x.subscriptionId === s.subscriptionId) === i
    );

    await Promise.allSettled(
      uniqueSubscriptions.map(({ subscriptionId }) =>
        subscriptionId
          ? this.fetcher(`/subscriptions/${subscriptionId}`, { method: "DELETE" }).catch((err) => {
              this.log.warn(`Failed to delete subscription ${subscriptionId}`, err);
            })
          : Promise.resolve()
      )
    );
  }

  async fetchAvailabilityAndSetCache(selectedCalendars: IntegrationCalendar[]) {
    this.log.debug("fetchAvailabilityAndSetCache", { selectedCalendars });

    const selectedCalendarsPerEventType = new Map<number | null, IntegrationCalendar[]>();
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
        timeMin: getTimeMin(),
        timeMax: getTimeMax(),
        items: selectedCalendars.map((sc) => ({ id: sc.externalId })),
      };
      const data = await this.fetchAvailability(
        parsedArgs.timeMin,
        parsedArgs.timeMax,
        parsedArgs.items.map((i) => i.id)
      );
      await this.setAvailabilityInCache(parsedArgs, data);
    }
  }

  async upsertSelectedCalendarsForEventTypeIds(
    data: Omit<Prisma.SelectedCalendarUncheckedCreateInput, "integration" | "credentialId" | "userId">,
    eventTypeIds: SelectedCalendarEventTypeIds
  ) {
    this.log.debug("upsertSelectedCalendarsForEventTypeIds", {
      data,
      eventTypeIds,
      credential: this.credential,
    });
    if (!this.credential.userId) {
      this.log.error("upsertSelectedCalendarsForEventTypeIds failed. userId is missing.");
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
      (acc: EnrichedBufferedBusyTime[], subResponse: { body: { value?: BodyValue[]; error?: Error[] } }) => {
        if (!subResponse.body?.value) return acc;
        return acc.concat(
          subResponse.body.value.reduce((acc: EnrichedBufferedBusyTime[], evt: BodyValue) => {
            if (evt.showAs === "free" || evt.showAs === "workingElsewhere") return acc;
            return acc.concat({
              start: `${evt.start.dateTime}Z`,
              end: `${evt.end.dateTime}Z`,
              ...(evt.createdDateTime ? { createdDateTime: evt.createdDateTime } : {}),
              ...(evt.id ? { id: evt.id } : {}),
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
}
