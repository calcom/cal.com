import prismock from "../../../../tests/libs/__mocks__/prisma";
import oAuthManagerMock, { defaultMockOAuthManager } from "../../tests/__mocks__/OAuthManager";
import { fetcherMock, mockResponses } from "./__mocks__/msgraph";

import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";
import "vitest-fetch-mock";

import { CalendarCache } from "@calcom/features/calendar-cache/calendar-cache";
import { getTimeMax, getTimeMin } from "@calcom/features/calendar-cache/lib/datesForCache";
import { getFeatureFlag } from "@calcom/features/flags/server/utils";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
import type { CredentialForCalendarServiceWithTenantId } from "@calcom/types/Credential";

import { getTokenObjectFromCredential } from "../../_utils/oauth/getTokenObjectFromCredential";
import Office365CalendarService from "./CalendarService";
import { getOfficeAppKeys } from "./getOfficeAppKeys";

// Mock dependencies
vi.mock("../../_utils/oauth/getTokenObjectFromCredential");
vi.mock("@calcom/features/flags/server/utils");
vi.mock("./getOfficeAppKeys");

const log = logger.getSubLogger({ prefix: ["Office365CalendarService.test"] });
vi.stubEnv("MICROSOFT_WEBHOOK_TOKEN", "test-webhook-token");

const outlookTestCredentialKey = {
  email: "",
  scope: "User.Read Calendars.Read Calendars.ReadWrite",
  token_type: "Bearer",
  expiry_date: 1625097600000,
  access_token: "",
  refresh_token: "",
  ext_expires_in: 3599,
};

const getSampleCredential = () => {
  return {
    invalid: false,
    key: outlookTestCredentialKey,
    type: "office365_calendar",
  };
};

const testSelectedCalendar = {
  userId: 123,
  integration: "office365_calendar",
  externalId: "cal1",
};

async function createCredentialForCalendarService({
  user = { email: "user@example.com" },
  delegatedTo = null,
  delegationCredentialId = null,
}: {
  user?: { email: string | null };
  delegatedTo?: NonNullable<CredentialForCalendarServiceWithTenantId["delegatedTo"]> | null;
  delegationCredentialId?: string | null;
} = {}): Promise<CredentialForCalendarServiceWithTenantId> {
  const defaultUser = await prismock.user.create({
    data: { email: user?.email ?? "" },
  });

  const app = await prismock.app.create({
    data: {
      slug: "office365_calendar",
      dirName: "office365_calendar",
    },
  });

  const credential = {
    ...getSampleCredential(),
    ...(delegationCredentialId ? { delegationCredential: { connect: { id: delegationCredentialId } } } : {}),
    key: {
      ...outlookTestCredentialKey,
      expiry_date: Date.now() - 1000,
    },
  };

  const credentialInDb = await prismock.credential.create({
    data: {
      ...credential,
      user: { connect: { id: defaultUser.id } },
      app: { connect: { slug: app.slug } },
    },
    include: { user: true },
  });

  return {
    ...credentialInDb,
    user: user ? { email: user.email ?? "" } : null,
    delegatedTo,
  } as CredentialForCalendarServiceWithTenantId;
}

async function createSelectedCalendarForDelegationCredential(data: {
  userId: number;
  credentialId: number | null;
  delegationCredentialId: string;
  externalId: string;
  integration: string;
  outlookSubscriptionId: string | null;
  outlookSubscriptionExpiration: string | null;
}) {
  if (!data.delegationCredentialId) {
    throw new Error("delegationCredentialId is required");
  }
  return await prismock.selectedCalendar.create({ data });
}

async function createSelectedCalendarForRegularCredential(data: {
  userId: number;
  delegationCredentialId: null;
  credentialId: number;
  externalId: string;
  integration: string;
  outlookSubscriptionId: string | null;
  outlookSubscriptionExpiration: string | null;
}) {
  if (!data.credentialId) {
    throw new Error("credentialId is required");
  }
  return await prismock.selectedCalendar.create({ data });
}

async function expectCacheToBeNotSet({ credentialId }: { credentialId: number }) {
  const caches = await prismock.calendarCache.findMany({
    where: { credentialId },
  });
  expect(caches).toHaveLength(0);
}

async function expectCacheToBeSet({
  credentialId,
  itemsInKey,
}: {
  credentialId: number;
  itemsInKey: { id: string }[];
}) {
  const caches = await prismock.calendarCache.findMany({
    where: { credentialId },
  });
  expect(caches).toHaveLength(1);
  expect(JSON.parse(caches[0].key)).toEqual(
    expect.objectContaining({
      items: itemsInKey,
    })
  );
}

async function expectSelectedCalendarToHaveOutlookSubscriptionProps(
  id: string,
  outlookSubscriptionProps: {
    outlookSubscriptionId: string;
    outlookSubscriptionExpiration: string;
  }
) {
  const selectedCalendar = await SelectedCalendarRepository.findById(id);
  expect(selectedCalendar).toEqual(expect.objectContaining(outlookSubscriptionProps));
}

async function expectSelectedCalendarToNotHaveOutlookSubscriptionProps(selectedCalendarId: string) {
  const selectedCalendar = await SelectedCalendarRepository.findFirst({
    where: { id: selectedCalendarId },
  });
  expect(selectedCalendar).toEqual(
    expect.objectContaining({
      outlookSubscriptionId: null,
      outlookSubscriptionExpiration: null,
    })
  );
}

function expectOutlookSubscriptionToHaveOccurredAndClearMock(fetcherSpy: any) {
  expect(fetcherSpy).toHaveBeenCalledWith(
    "/subscriptions",
    expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"changeType":"created,updated,deleted"'),
    })
  );
  fetcherSpy.mockClear();
}

function expectOutlookSubscriptionToNotHaveOccurredAndClearMock(fetcherSpy: any) {
  expect(fetcherSpy).not.toHaveBeenCalledWith("/subscriptions");
  fetcherSpy.mockClear();
}

function expectOutlookUnsubscriptionToHaveOccurredAndClearMock(subscriptionIds: string[]) {
  subscriptionIds.forEach((id) => {
    expect(fetcherMock).toHaveBeenCalledWith(`/subscriptions/${id}`, { method: "DELETE" });
  });
  fetcherMock.mockClear();
}

function expectOutlookUnsubscriptionToNotHaveOccurredAndClearMock(fetcherSpy: any) {
  expect(fetcherSpy).not.toHaveBeenCalledWith(
    expect.stringContaining("/subscriptions"),
    expect.objectContaining({ method: "DELETE" })
  );
  fetcherSpy.mockClear();
}

const calendarCacheHelpers = {
  FUTURE_EXPIRATION_DATE: new Date(Date.now() + 100000000),
  getDatePair: () => {
    const dateFrom = "2025-05-04T00:00:00Z";
    const dateTo = "2025-05-04T23:59:59Z";
    return { dateFrom, dateTo, minDateFrom: getTimeMin(dateFrom), maxDateTo: getTimeMax(dateTo) };
  },
  setCache: async ({
    credentialId,
    key,
    value,
    userId,
    expiresAt,
  }: {
    credentialId: number;
    key: string;
    value: string;
    userId: number | null;
    expiresAt: Date;
  }) => {
    log.info("Setting Calendar Cache", safeStringify({ key, value, expiresAt, credentialId, userId }));
    await prismock.calendarCache.create({
      data: {
        key,
        value,
        expiresAt,
        credentialId,
        userId,
      },
    });
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  fetcherMock.mockClear();
  vi.mocked(getTokenObjectFromCredential).mockReturnValue({
    access_token: "mock_access_token",
    refresh_token: "mock_refresh_token",
    expires_at: new Date(Date.now() + 3600 * 1000),
  });
  vi.mocked(getOfficeAppKeys).mockResolvedValue({
    client_id: "mock_client_id",
    client_secret: "mock_client_secret",
  });
  vi.mocked(getFeatureFlag).mockResolvedValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Calendar Cache", () => {
  test("Calendar Cache is being read on cache HIT", async () => {
    const credentialInDb = await createCredentialForCalendarService();
    const { dateFrom, dateTo } = calendarCacheHelpers.getDatePair();
    const mockBusyTimes = [{ start: "2025-05-04T10:00:00Z", end: "2025-05-04T11:00:00Z" }];

    // Create cache
    const calendarCache = await CalendarCache.init(null);
    await calendarCache.upsertCachedAvailability({
      credentialId: credentialInDb.id,
      userId: credentialInDb.userId,
      args: {
        timeMin: getTimeMin(dateFrom),
        timeMax: getTimeMax(dateTo),
        items: [{ id: testSelectedCalendar.externalId }],
      },
      value: JSON.parse(JSON.stringify(mockBusyTimes)),
    });
    oAuthManagerMock.OAuthManager = defaultMockOAuthManager;

    const calendarService = new Office365CalendarService(credentialInDb);
    const data = await calendarService.getAvailability(dateFrom, dateTo, [testSelectedCalendar]);
    expect(data).toEqual(mockBusyTimes);
  });

  test("Calendar Cache is being ignored on cache MISS", async () => {
    const credentialInDb = await createCredentialForCalendarService();
    const { dateFrom, dateTo } = calendarCacheHelpers.getDatePair();
    const calendarService = new Office365CalendarService(credentialInDb);

    // Spy on fetcher for this instance
    const fetcherSpy = vi
      .spyOn(calendarService, "fetcher" as any)
      .mockImplementation(async (endpoint, init) => {
        return fetcherMock(endpoint, init);
      });

    fetcherMock.mockImplementation(async (endpoint, init) => {
      if (endpoint === "/me") {
        return mockResponses.user();
      }
      if (endpoint.includes("/$batch")) {
        const batchResponse = await mockResponses.batchAvailability([testSelectedCalendar.externalId]).json();
        return Promise.resolve({
          status: 200,
          headers: new Map([
            ["Content-Type", "application/json"],
            ["Retry-After", "0"],
          ]),
          json: async () => Promise.resolve(JSON.stringify({ responses: batchResponse.responses })),
        });
      }
      return new Response(null, { status: 404 });
    });

    const data = await calendarService.getAvailability(dateFrom, dateTo, [testSelectedCalendar]);

    expect(data).toEqual([{ start: "2025-05-04T10:00:00Z", end: "2025-05-04T11:00:00Z" }]);
    fetcherSpy.mockRestore();
  });

  test("fetchAvailabilityAndSetCache should fetch and cache availability for selected calendars grouped by eventTypeId", async () => {
    const credentialInDb = await createCredentialForCalendarService();
    const calendarService = new Office365CalendarService(credentialInDb);
    const selectedCalendars = [
      { externalId: "cal1", integration: "office365_calendar", eventTypeId: 1 },
      { externalId: "cal2", integration: "office365_calendar", eventTypeId: 1 },
      { externalId: "cal1", integration: "office365_calendar", eventTypeId: 2 },
      { externalId: "cal1", integration: "office365_calendar", eventTypeId: null },
    ];

    const fetcherSpy = vi
      .spyOn(calendarService, "fetcher" as any)
      .mockImplementation(async (endpoint, init) => {
        return fetcherMock(endpoint, init);
      });

    fetcherMock.mockImplementation(async (endpoint, init) => {
      if (endpoint === "/me") {
        return mockResponses.user();
      }
      if (endpoint.includes("/$batch")) {
        const batchResponse = await mockResponses.batchAvailability(["cal1", "cal2"]).json();
        return Promise.resolve({
          status: 200,
          headers: new Map([
            ["Content-Type", "application/json"],
            ["Retry-After", "0"],
          ]),
          json: async () => Promise.resolve(JSON.stringify({ responses: batchResponse.responses })),
        });
      }
      return new Response(null, { status: 404 });
    });

    const setAvailabilityInCacheSpy = vi.spyOn(calendarService, "setAvailabilityInCache");

    await calendarService.fetchAvailabilityAndSetCache(selectedCalendars);
    expect(fetcherMock).toHaveBeenCalledWith(
      "/$batch",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"url":"/users/user@example.com/calendars/cal1/calendarView'),
      })
    );
    expect(fetcherMock).toHaveBeenCalledWith(
      "/$batch",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"url":"/users/user@example.com/calendars/cal2/calendarView'),
      })
    );
    expect(setAvailabilityInCacheSpy).toHaveBeenCalledTimes(3); // One for eventTypeId: 1, one for eventTypeId: 2, one for eventTypeId: null

    setAvailabilityInCacheSpy.mockRestore();
    fetcherSpy.mockRestore();
  });

  test("A cache set through fetchAvailabilityAndSetCache should be used when doing getAvailability", async () => {
    const credentialInDb = await createCredentialForCalendarService();
    const calendarService = new Office365CalendarService(credentialInDb);
    vi.setSystemTime(new Date("2025-05-04T00:00:00.000Z"));
    const selectedCalendars = [
      {
        externalId: "cal1",
        integration: "office365_calendar",
        eventTypeId: null,
        credentialId: credentialInDb.id,
        userId: credentialInDb.userId!,
      },
    ];

    const mockedBusyTimes = [{ start: "2025-05-04T10:00:00Z", end: "2025-05-04T11:00:00Z" }];

    const fetcherSpy = vi
      .spyOn(calendarService, "fetcher" as any)
      .mockImplementation(async (endpoint, init) => {
        return fetcherMock(endpoint, init);
      });
    fetcherMock.mockImplementation(async (endpoint, init) => {
      if (endpoint === "/me") {
        return mockResponses.user();
      }
      if (endpoint.includes("/$batch")) {
        const batchResponse = await mockResponses.batchAvailability(["cal1"]).json();
        return Promise.resolve({
          status: 200,
          headers: new Map([
            ["Content-Type", "application/json"],
            ["Retry-After", "0"],
          ]),
          json: async () => Promise.resolve(JSON.stringify({ responses: batchResponse.responses })),
        });
      }
      return new Response(null, { status: 404 });
    });

    const calendarCachesBefore = await prismock.calendarCache.findMany();
    expect(calendarCachesBefore).toHaveLength(0);
    await calendarService.fetchAvailabilityAndSetCache(selectedCalendars);
    const calendarCachesAfter = await prismock.calendarCache.findMany();
    expect(calendarCachesAfter).toHaveLength(1);

    fetcherMock.mockImplementation(async (endpoint, init) => {
      if (endpoint === "/me") {
        return mockResponses.user();
      }
      return new Response(null, { status: 404 });
    });

    const result = await calendarService.getAvailability(
      "2025-05-04T00:00:00.000Z",
      "2025-05-04T23:59:59.000Z",
      selectedCalendars,
      true
    );
    expect(result).toEqual(mockedBusyTimes);
    expect(fetcherMock).not.toHaveBeenCalledWith(expect.stringContaining("/$batch"));
    fetcherSpy.mockRestore();
  });
});

describe("Watching and unwatching calendar", () => {
  test("Calendar can be watched and unwatched", async () => {
    const credentialInDb = await createCredentialForCalendarService();
    const calendarService = new Office365CalendarService(credentialInDb);

    // Spy on fetcher for this instance
    const fetcherSpy = vi
      .spyOn(calendarService, "fetcher" as any)
      .mockImplementation(async (endpoint, init) => {
        return fetcherMock(endpoint, init);
      });

    fetcherMock.mockImplementation(async (endpoint) => {
      if (endpoint === "/me") return mockResponses.user();
      if (endpoint === "/subscriptions") return mockResponses.subscriptionCreate();
      if (endpoint.includes("/subscriptions/")) return mockResponses.subscriptionDelete();
      return new Response(null, { status: 404 });
    });

    await calendarService.watchCalendar({
      calendarId: testSelectedCalendar.externalId,
      eventTypeIds: [null],
    });

    const watchedCalendar = await prismock.selectedCalendar.findFirst({
      where: {
        userId: credentialInDb.userId!,
        externalId: testSelectedCalendar.externalId,
        integration: "office365_calendar",
      },
    });

    expect(watchedCalendar).toEqual(
      expect.objectContaining({
        userId: credentialInDb.userId,
        eventTypeId: null,
        integration: "office365_calendar",
        externalId: testSelectedCalendar.externalId,
        credentialId: credentialInDb.id,
        outlookSubscriptionId: "mock-subscription-id",
        outlookSubscriptionExpiration: "2025-05-07T00:00:00Z",
      })
    );

    await calendarService.unwatchCalendar({
      calendarId: testSelectedCalendar.externalId,
      eventTypeIds: [null],
    });

    const calendarAfterUnwatch = await prismock.selectedCalendar.findFirst({
      where: {
        userId: credentialInDb.userId!,
        externalId: testSelectedCalendar.externalId,
        integration: "office365_calendar",
      },
    });

    expect(calendarAfterUnwatch).toEqual(
      expect.objectContaining({
        outlookSubscriptionId: null,
        outlookSubscriptionExpiration: null,
      })
    );
    expectOutlookSubscriptionToHaveOccurredAndClearMock(fetcherSpy);
    expectOutlookUnsubscriptionToHaveOccurredAndClearMock(["mock-subscription-id"]);
    fetcherSpy.mockRestore();
  });

  test("watchCalendar should not do subscription if already subscribed for the same calendarId", async () => {
    const credentialInDb = await createCredentialForCalendarService();
    const calendarService = new Office365CalendarService(credentialInDb);

    const userLevelCalendar = await SelectedCalendarRepository.create({
      userId: credentialInDb.userId!,
      externalId: "cal1",
      integration: "office365_calendar",
      eventTypeId: null,
      credentialId: credentialInDb.id,
      outlookSubscriptionId: "mock-subscription-id",
      outlookSubscriptionExpiration: "2025-05-07T00:00:00Z",
    });

    const eventTypeLevelCalendar = await SelectedCalendarRepository.create({
      userId: credentialInDb.userId!,
      externalId: "cal1",
      integration: "office365_calendar",
      eventTypeId: 1,
      credentialId: credentialInDb.id,
    });

    // Spy on fetcher for this instance
    const fetcherSpy = vi
      .spyOn(calendarService, "fetcher" as any)
      .mockImplementation(async (endpoint, init) => {
        return fetcherMock(endpoint, init);
      });

    fetcherMock.mockImplementation(async (endpoint) => {
      if (endpoint === "/me") return mockResponses.user();
      if (endpoint === "/subscriptions") return mockResponses.subscriptionCreate();
      if (endpoint.includes("/subscriptions/")) return mockResponses.subscriptionDelete();
      return new Response(null, { status: 404 });
    });

    await calendarService.watchCalendar({
      calendarId: userLevelCalendar.externalId,
      eventTypeIds: [userLevelCalendar.eventTypeId],
    });

    expectOutlookSubscriptionToHaveOccurredAndClearMock(fetcherSpy);

    await calendarService.watchCalendar({
      calendarId: eventTypeLevelCalendar.externalId,
      eventTypeIds: [eventTypeLevelCalendar.eventTypeId],
    });

    expectOutlookSubscriptionToNotHaveOccurredAndClearMock(fetcherSpy);
    await expectSelectedCalendarToHaveOutlookSubscriptionProps(eventTypeLevelCalendar.id, {
      outlookSubscriptionId: "mock-subscription-id",
      outlookSubscriptionExpiration: "2025-05-07T00:00:00Z",
    });
    fetcherSpy.mockRestore();
  });

  test("unwatchCalendar should not unsubscribe if there is another selectedCalendar with same externalId and credentialId", async () => {
    const credentialInDb = await createCredentialForCalendarService();
    const calendarService = new Office365CalendarService(credentialInDb);

    await prismock.calendarCache.create({
      data: {
        key: JSON.stringify({ items: [{ id: "cal1" }] }),
        value: "test-value",
        expiresAt: new Date(Date.now() + 100000000),
        credentialId: credentialInDb.id,
      },
    });

    const commonProps = {
      userId: credentialInDb.userId!,
      externalId: "cal1",
      integration: "office365_calendar",
      credentialId: credentialInDb.id,
      outlookSubscriptionId: "mock-subscription-id",
      outlookSubscriptionExpiration: "2025-05-07T00:00:00Z",
    };

    const userLevelCalendar = await SelectedCalendarRepository.create({
      ...commonProps,
      eventTypeId: null,
    });

    const eventTypeLevelCalendar = await SelectedCalendarRepository.create({
      ...commonProps,
      eventTypeId: 1,
    });

    // Spy on fetcher for this instance
    const fetcherSpy = vi
      .spyOn(calendarService, "fetcher" as any)
      .mockImplementation(async (endpoint, init) => {
        return fetcherMock(endpoint, init);
      });
    fetcherMock.mockImplementation(async (endpoint) => {
      if (endpoint === "/me") return mockResponses.user();
      if (endpoint.includes("/subscriptions/")) return mockResponses.subscriptionDelete();
      return new Response(null, { status: 404 });
    });

    await calendarService.unwatchCalendar({
      calendarId: userLevelCalendar.externalId,
      eventTypeIds: [userLevelCalendar.eventTypeId],
    });

    expectOutlookUnsubscriptionToNotHaveOccurredAndClearMock(fetcherSpy);
    await expectSelectedCalendarToNotHaveOutlookSubscriptionProps(userLevelCalendar.id);

    await calendarService.unwatchCalendar({
      calendarId: eventTypeLevelCalendar.externalId,
      eventTypeIds: [eventTypeLevelCalendar.eventTypeId],
    });

    expectOutlookUnsubscriptionToHaveOccurredAndClearMock(["mock-subscription-id"]);
    await expectSelectedCalendarToNotHaveOutlookSubscriptionProps(eventTypeLevelCalendar.id);
    fetcherSpy.mockRestore();
  });
});
