import prismock from "../../../../tests/libs/__mocks__/prisma";
import oAuthManagerMock, { defaultMockOAuthManager } from "../../tests/__mocks__/OAuthManager";
import { fetcherMock, mockResponses } from "./__mocks__/msgraph";

import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";
import "vitest-fetch-mock";

import { CalendarCache } from "@calcom/features/calendar-cache/calendar-cache";
import { getTimeMax, getTimeMin } from "@calcom/features/calendar-cache/lib/datesForCache";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
import type { CredentialForCalendarServiceWithTenantId } from "@calcom/types/Credential";

import { getTokenObjectFromCredential } from "../../_utils/oauth/getTokenObjectFromCredential";
import Office365CalendarService from "./CalendarService";
import { getOfficeAppKeys } from "./getOfficeAppKeys";

// Mock dependencies
vi.mock("../../_utils/oauth/getTokenObjectFromCredential");
vi.mock("@calcom/features/flags/server/utils", () => ({
  getFeatureFlag: vi.fn().mockReturnValue(true),
}));
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

function expectOutlookSubscriptionToHaveOccurredAndClearMock() {
  expect(fetcherMock).toHaveBeenCalledWith(
    "/subscriptions",
    expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"changeType":"created,updated,deleted"'),
    })
  );
  fetcherMock.mockClear();
}

function expectOutlookSubscriptionToNotHaveOccurredAndClearMock() {
  expect(fetcherMock).not.toHaveBeenCalledWith("/subscriptions", expect.objectContaining({ method: "POST" }));
  fetcherMock.mockClear();
}

function expectOutlookUnsubscriptionToHaveOccurredAndClearMock(subscriptionIds: string[]) {
  subscriptionIds.forEach((id) => {
    expect(fetcherMock).toHaveBeenCalledWith(`/subscriptions/${id}`, { method: "DELETE" });
  });
  fetcherMock.mockClear();
}

function expectOutlookUnsubscriptionToNotHaveOccurredAndClearMock() {
  expect(fetcherMock).not.toHaveBeenCalledWith(
    expect.stringContaining("/subscriptions"),
    expect.objectContaining({ method: "DELETE" })
  );
  fetcherMock.mockClear();
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
    const calendarCache = await CalendarCache.init(null);

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
});
