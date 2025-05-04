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

function createInMemoryCredential({
  userId,
  delegationCredentialId,
  delegatedTo,
}: {
  userId: number;
  delegationCredentialId: string | null;
  delegatedTo: NonNullable<CredentialForCalendarServiceWithTenantId["delegatedTo"]>;
}) {
  return {
    id: -1,
    userId,
    key: {
      access_token: "NOOP_UNUSED_DELEGATION_TOKEN",
    },
    invalid: false,
    teamId: null,
    team: null,
    type: "office365_calendar",
    appId: "office365_calendar",
    delegatedToId: delegationCredentialId,
    delegatedTo: delegatedTo.serviceAccountKey
      ? {
          serviceAccountKey: delegatedTo.serviceAccountKey,
        }
      : null,
  };
}

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

const defaultDelegatedCredential = {
  serviceAccountKey: {
    client_id: "service-client-id",
    private_key: "service-private-key",
    tenant_id: "service-tenant-id",
  },
} as const;

async function createDelegationCredentialForCalendarService({
  user,
  delegatedTo,
  delegationCredentialId,
}: {
  user?: { email: string } | null;
  delegatedTo?: typeof defaultDelegatedCredential;
  delegationCredentialId: string;
}) {
  return await createCredentialForCalendarService({
    user: user || {
      email: "service@example.com",
    },
    delegatedTo: delegatedTo || defaultDelegatedCredential,
    delegationCredentialId,
  });
}

async function createDelegationCredentialForCalendarCache({
  user,
  delegatedTo,
  delegationCredentialId,
}: {
  user?: { email: string } | null;
  delegatedTo?: typeof defaultDelegatedCredential;
  delegationCredentialId: string;
}) {
  delegatedTo = delegatedTo || defaultDelegatedCredential;
  const credentialInDb = await createCredentialForCalendarService({
    user: user || {
      email: "service@example.com",
    },
  });

  return {
    ...createInMemoryCredential({
      userId: credentialInDb.userId!,
      delegationCredentialId,
      delegatedTo,
    }),
    ...credentialInDb,
  };
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

  describe("Delegation Credential", () => {
    test("On watching a SelectedCalendar having delegationCredential, it should set outlookSubscriptionId and other props", async () => {
      const delegationCredential = await createDelegationCredentialForCalendarService({
        user: { email: "user1@example.com" },
        delegationCredentialId: "delegation-credential-id-1",
      });

      await prismock.selectedCalendar.create({
        data: {
          userId: delegationCredential.userId!,
          externalId: testSelectedCalendar.externalId,
          integration: "office365_calendar",
          credentialId: delegationCredential.id,
          delegationCredentialId: delegationCredential.delegatedToId!,
        },
      });

      const calendarService = new Office365CalendarService(delegationCredential);
      vi.spyOn(global, "fetch")
        .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "token" }), { status: 200 }))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ value: [{ userPrincipalName: "user@example.com", id: "user123" }] }),
            {
              status: 200,
            }
          )
        );
      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(async (endpoint, init) => {
          return fetcherMock(endpoint, init);
        });
      fetcherMock.mockImplementation(async (endpoint) => {
        if (endpoint === "/me") return mockResponses.user();
        if (endpoint === "/subscriptions") return mockResponses.subscriptionCreate();
        return new Response(null, { status: 404 });
      });

      await calendarService.watchCalendar({
        calendarId: testSelectedCalendar.externalId,
        eventTypeIds: [null],
      });

      expectOutlookSubscriptionToHaveOccurredAndClearMock(fetcherSpy);
      const calendars = await prismock.selectedCalendar.findMany();
      expect(calendars).toHaveLength(1);
      await expectSelectedCalendarToHaveOutlookSubscriptionProps(calendars[0].id, {
        outlookSubscriptionId: "mock-subscription-id",
        outlookSubscriptionExpiration: "2025-05-07T00:00:00Z",
      });
      fetcherSpy.mockRestore();
    });

    test("On unwatching a SelectedCalendar connected to Delegation Credential, it should remove outlookSubscriptionId and other props", async () => {
      const delegationCredential = await createDelegationCredentialForCalendarCache({
        user: { email: "user1@example.com" },
        delegationCredentialId: "delegation-credential-id-1",
      });

      const selectedCalendar = await createSelectedCalendarForDelegationCredential({
        userId: delegationCredential.userId!,
        delegationCredentialId: delegationCredential.delegatedToId!,
        credentialId: delegationCredential.id,
        externalId: testSelectedCalendar.externalId,
        integration: "office365_calendar",
        outlookSubscriptionId: "mock-subscription-id",
        outlookSubscriptionExpiration: "2025-05-07T00:00:00Z",
      });

      const calendarService = new Office365CalendarService(delegationCredential);
      vi.spyOn(global, "fetch")
        .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "token" }), { status: 200 }))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ value: [{ userPrincipalName: "user@example.com", id: "user123" }] }),
            {
              status: 200,
            }
          )
        );
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
        calendarId: selectedCalendar.externalId,
        eventTypeIds: [null],
      });

      expectOutlookUnsubscriptionToHaveOccurredAndClearMock(["mock-subscription-id"]);
      const calendars = await prismock.selectedCalendar.findMany();
      expect(calendars).toHaveLength(1);
      await expectSelectedCalendarToNotHaveOutlookSubscriptionProps(calendars[0].id);
      fetcherSpy.mockRestore();
    });
  });
});

describe("getAvailability", () => {
  test("returns availability for selected calendars with primary fallback", async () => {
    const credential = await createCredentialForCalendarService();
    const calendarService = new Office365CalendarService(credential);

    const fetcherSpy = vi
      .spyOn(calendarService, "fetcher" as any)
      .mockImplementation(async (endpoint, init) => {
        return fetcherMock(endpoint, init);
      });
    fetcherMock.mockImplementation(async (endpoint) => {
      if (endpoint === "/me") return mockResponses.user();
      if (endpoint === "/users/user@example.com") return mockResponses.user();
      if (endpoint.includes("/calendars?$select")) return mockResponses.calendars();
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

    const availability = await calendarService.getAvailability(
      "2025-05-04T00:00:00Z",
      "2025-05-04T23:59:59Z",
      [],
      false,
      true
    );

    expect(availability).toEqual([{ start: "2025-05-04T10:00:00Z", end: "2025-05-04T11:00:00Z" }]);
    expect(fetcherMock).toHaveBeenCalledWith(
      "/$batch",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"url":"/users/user@example.com/calendars/cal1/calendarView'),
      })
    );
    fetcherSpy.mockRestore();
  });

  // test("handles pagination with @odata.nextLink in availability", async () => {
  //   const credential = await createCredentialForCalendarService();
  //   const calendarService = new Office365CalendarService(credential);

  //   const fetcherSpy = vi
  //     .spyOn(calendarService, "fetcher" as any)
  //     .mockImplementation(async (endpoint, init) => {
  //       log.debug("fetcherSpy", { endpoint, init });
  //       return fetcherMock(endpoint, init);
  //     });
  //   fetcherMock.mockImplementation(async (endpoint) => {
  //     if (endpoint === "/me") return mockResponses.user();
  //     if (endpoint === "/users/user@example.com") return mockResponses.user();
  //     if (endpoint.includes("/calendars?$select")) return mockResponses.calendars();
  //     if (endpoint.includes("/$batch")) {
  //       // const batchResponse = await mockResponses.batchAvailabilityPagination(["cal1"]).json();
  //       return Promise.resolve({
  //         status: 200,
  //         headers: new Map([
  //           ["Content-Type", "application/json"],
  //           ["Retry-After", "0"],
  //         ]),
  //         json: async () =>
  //           Promise.resolve({ responses: mockResponses.batchAvailabilityPagination(["cal1"]) }),
  //       });
  //     }
  //     if (endpoint.includes("next")) {
  //       const batchResponse = await mockResponses.nextPage().json();
  //       return Promise.resolve({
  //         status: 200,
  //         headers: new Map([
  //           ["Content-Type", "application/json"],
  //           ["Retry-After", "0"],
  //         ]),
  //         json: async () => Promise.resolve(JSON.stringify({ responses: batchResponse.responses })),
  //       });
  //     }

  //     return new Response(null, { status: 404 });
  //   });

  //   const availability = await calendarService.getAvailability(
  //     "2025-05-04T00:00:00Z",
  //     "2025-05-04T23:59:59Z",
  //     [{ externalId: "cal1", integration: "office365_calendar" }],
  //     false
  //   );

  //   expect(availability).toEqual([
  //     { start: "2025-05-04T10:00:00Z", end: "2025-05-04T11:00:00Z" },
  //     { start: "2025-05-04T12:00:00Z", end: "2025-05-04T13:00:00Z" },
  //   ]);
  //   fetcherSpy.mockRestore();
  // });

  // test("handles retry-after for 429 responses in availability", async () => {
  //   const credential = await createCredentialForCalendarService();
  //   const calendarService = new Office365CalendarService(credential);

  //   let callCount = 0;
  //   const fetcherSpy = vi
  //     .spyOn(calendarService, "fetcher" as any)
  //     .mockImplementation(async (endpoint, init) => {
  //       return fetcherMock(endpoint, init);
  //     });
  //   fetcherMock.mockImplementation(async (endpoint) => {
  //     if (endpoint === "/me") return mockResponses.user();
  //     if (endpoint.includes("/calendars?$select")) return mockResponses.calendars();
  //     if (endpoint.includes("/$batch")) {
  //       callCount++;
  //       if (callCount === 1) {
  //         return Promise.resolve({
  //           status: 200,
  //           headers: new Map([
  //             ["Content-Type", "application/json"],
  //             ["Retry-After", "0"],
  //           ]),
  //           json: async () =>
  //             Promise.resolve(
  //               JSON.stringify({
  //                 responses: [
  //                   {
  //                     id: "0",
  //                     status: 429,
  //                     headers: { "Retry-After": "1" },
  //                     body: {},
  //                   },
  //                 ],
  //               })
  //             ),
  //         });
  //       }
  //       const batchResponse = await mockResponses.batchAvailability(["cal1"]).json();
  //       return Promise.resolve({
  //         status: 200,
  //         headers: new Map([
  //           ["Content-Type", "application/json"],
  //           ["Retry-After", "0"],
  //         ]),
  //         json: async () => Promise.resolve(JSON.stringify({ responses: batchResponse.responses })),
  //       });
  //     }
  //     return new Response(null, { status: 404 });
  //   });

  //   const availability = await calendarService.getAvailability(
  //     "2025-05-04T00:00:00Z",
  //     "2025-05-04T23:59:59Z",
  //     [{ externalId: "cal1", integration: "office365_calendar" }],
  //     false
  //   );

  //   expect(availability).toEqual([{ start: "2025-05-04T10:00:00Z", end: "2025-05-04T11:00:00Z" }]);
  //   expect(callCount).toBe(2); // Initial call + retry
  //   fetcherSpy.mockRestore();
  // });
});

describe("Delegation Credential Error handling", () => {
  test("handles missing tenantId for delegation credential", async () => {
    const credentialWithDelegation = await createCredentialForCalendarService({
      user: { email: "user@example.com" },
      delegatedTo: {
        serviceAccountKey: {
          client_id: "id",
          private_key: "key",
          tenant_id: "",
        },
      },
    });
    const calendarService = new Office365CalendarService(credentialWithDelegation);
    await expect(calendarService.testDelegationCredentialSetup()).rejects.toThrow(
      "Invalid DelegationCredential Settings: tenantId is missing"
    );
  });

  test("handles missing client_id or private_key for delegation credential", async () => {
    const credentialWithDelegation = await createCredentialForCalendarService({
      user: { email: "user@example.com" },
      delegatedTo: {
        serviceAccountKey: {
          tenant_id: "tenant123",
          client_id: "",
          private_key: "",
        },
      },
    });
    const calendarService = new Office365CalendarService(credentialWithDelegation);
    await expect(calendarService.getUserEndpoint()).rejects.toThrow(
      "Delegation credential without clientId or Secret"
    );
  });

  test("handles user not found in Azure AD", async () => {
    const credentialWithDelegation = await createDelegationCredentialForCalendarService({
      user: { email: "user1@example.com" },
      delegationCredentialId: "delegation-credential-id-1",
    });

    const calendarService = new Office365CalendarService(credentialWithDelegation);
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ value: [] }), { status: 200 }));

    await expect(calendarService.getUserEndpoint()).rejects.toThrow(
      "User might not exist in Microsoft Azure Active Directory"
    );
  });

  test("testDelegationCredentialSetup returns true for valid credentials", async () => {
    const credentialWithDelegation = await createDelegationCredentialForCalendarService({
      user: { email: "user1@example.com" },
      delegationCredentialId: "delegation-credential-id-1",
    });

    const calendarService = new Office365CalendarService(credentialWithDelegation);
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: "token" }), { status: 200 })
    );

    const result = await calendarService.testDelegationCredentialSetup();
    expect(result).toBe(true);
  });
});

describe("Office365CalendarService credential handling", () => {
  test("uses regular auth when no delegation credential is provided", async () => {
    const regularCredential = await createCredentialForCalendarService();
    const calendarService = new Office365CalendarService(regularCredential);

    const fetcherSpy = vi
      .spyOn(calendarService, "fetcher" as any)
      .mockImplementation(async (endpoint, init) => {
        return fetcherMock(endpoint, init);
      });
    fetcherMock.mockImplementation(async (endpoint) => {
      if (endpoint === "/me") return mockResponses.user();
      return new Response(null, { status: 404 });
    });

    const userEndpoint = await calendarService.getUserEndpoint();
    expect(userEndpoint).toBe("/users/user@example.com");
    expect(fetcherSpy).toHaveBeenCalledWith("/me");
    fetcherSpy.mockClear();
  });

  test("uses delegated auth with tenantId when delegation credential is provided", async () => {
    const credentialWithDelegation = await createDelegationCredentialForCalendarService({
      user: { email: "user1@example.com" },
      delegationCredentialId: "delegation-credential-id-1",
    });

    const calendarService = new Office365CalendarService(credentialWithDelegation);
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "token" }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ value: [{ userPrincipalName: "delegated@example.com", id: "user123" }] }),
          {
            status: 200,
          }
        )
      );

    const userEndpoint = await calendarService.getUserEndpoint();
    expect(userEndpoint).toBe("/users/delegated@example.com");
    expect(global.fetch).toHaveBeenCalledWith(
      `https://login.microsoftonline.com/${credentialWithDelegation.delegatedTo?.serviceAccountKey.tenant_id}/oauth2/v2.0/token`,
      expect.any(Object)
    );
  });
});

describe("Response Handling", () => {
  test("handleTextJsonResponseWithHtmlInBody should parse response with HTML", async () => {
    const credentialInDb = await createCredentialForCalendarService();
    const calendarService = new Office365CalendarService(credentialInDb);

    const fetcherSpy = vi
      .spyOn(calendarService, "fetcher" as any)
      .mockImplementation(async (endpoint, init) => {
        return fetcherMock(endpoint, init);
      });
    fetcherMock.mockImplementation(async (endpoint) => {
      if (endpoint === "/me") return mockResponses.user();
      if (endpoint.includes("/$batch")) {
        return Promise.resolve({
          status: 200,
          headers: new Map([
            ["Content-Type", "application/json"],
            ["Retry-After", "0"],
          ]),
          json: async () =>
            Promise.resolve(
              JSON.stringify({
                responses: [
                  {
                    id: "0",
                    status: 200,
                    body: "<html><body>Error</body></html>",
                  },
                ],
              })
            ),
        });
      }
      return new Response(null, { status: 404 });
    });

    const availability = await calendarService.getAvailability(
      "2025-05-04T00:00:00Z",
      "2025-05-04T23:59:59Z",
      [{ externalId: "cal1", integration: "office365_calendar" }],
      false
    );

    expect(availability).toEqual([]);
    fetcherSpy.mockClear();
  });
});
