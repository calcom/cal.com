import prismock from "../../../../tests/libs/__mocks__/prisma";
import oAuthManagerMock, { defaultMockOAuthManager } from "../../tests/__mocks__/OAuthManager";

import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";
import "vitest-fetch-mock";

import { CalendarCache } from "@calcom/features/calendar-cache/calendar-cache";
import { getTimeMax, getTimeMin } from "@calcom/features/calendar-cache/lib/datesForCache";
import { getFeatureFlag } from "@calcom/features/flags/server/utils";
import logger from "@calcom/lib/logger";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";

import { getTokenObjectFromCredential } from "../../_utils/oauth/getTokenObjectFromCredential";
import Office365CalendarService from "./CalendarService";
import { defaultFetcherMockImplementation, mockResponses } from "./__test_utils__/mocks";
import {
  calendarCacheHelpers,
  createCredentialForCalendarService,
  createDelegationCredentialForCalendarCache,
  createDelegationCredentialForCalendarService,
  createSelectedCalendarForDelegationCredential,
  expectOutlookSubscriptionToHaveOccurredAndClearMock,
  expectOutlookSubscriptionToNotHaveOccurredAndClearMock,
  expectOutlookUnsubscriptionToHaveOccurredAndClearMock,
  expectOutlookUnsubscriptionToNotHaveOccurredAndClearMock,
  expectSelectedCalendarToHaveOutlookSubscriptionProps,
  expectSelectedCalendarToNotHaveOutlookSubscriptionProps,
  testSelectedCalendar,
} from "./__test_utils__/utils";
import { getOfficeAppKeys } from "./getOfficeAppKeys";

// Mock dependencies
vi.mock("../../_utils/oauth/getTokenObjectFromCredential");
vi.mock("@calcom/features/flags/server/utils");
vi.mock("./getOfficeAppKeys");

const log = logger.getSubLogger({ prefix: ["Office365CalendarService.test"] });
vi.stubEnv("MICROSOFT_WEBHOOK_TOKEN", "test-webhook-token");

beforeEach(() => {
  vi.clearAllMocks();
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
  vi.useRealTimers();
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
    const calendarCache = await CalendarCache.init(null);
    const credentialInDb = await createCredentialForCalendarService();
    const dateFrom = new Date(Date.now()).toISOString();
    const dateTo = new Date(Date.now() + 100000000).toISOString();
    const calendarService = new Office365CalendarService(credentialInDb);

    const fetcherSpy = vi
      .spyOn(calendarService, "fetcher" as any)
      .mockImplementation(defaultFetcherMockImplementation);

    // Test Cache Miss
    await calendarService.getAvailability(dateFrom, dateTo, [testSelectedCalendar]);
    expect(fetcherSpy).toHaveBeenCalledWith(
      "/$batch",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"url":"/users/user@example.com/calendars/cal1/calendarView'),
      })
    );

    // Expect cache to be ignored in case of a MISS
    const cachedAvailability = await calendarCache.getCachedAvailability({
      credentialId: credentialInDb.id,
      userId: null,
      args: {
        timeMin: dateFrom,
        timeMax: dateTo,
        items: [{ id: testSelectedCalendar.externalId }],
      },
    });

    expect(cachedAvailability).toBeNull();
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
      .mockImplementation(defaultFetcherMockImplementation);

    const setAvailabilityInCacheSpy = vi.spyOn(calendarService, "setAvailabilityInCache");

    await calendarService.fetchAvailabilityAndSetCache(selectedCalendars);
    expect(fetcherSpy).toHaveBeenCalledWith(
      "/$batch",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"url":"/users/user@example.com/calendars/cal1/calendarView'),
      })
    );
    expect(fetcherSpy).toHaveBeenCalledWith(
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
      .mockImplementation(defaultFetcherMockImplementation);

    const calendarCachesBefore = await prismock.calendarCache.findMany();
    expect(calendarCachesBefore).toHaveLength(0);
    await calendarService.fetchAvailabilityAndSetCache(selectedCalendars);
    const calendarCachesAfter = await prismock.calendarCache.findMany();
    expect(calendarCachesAfter).toHaveLength(1);

    const result = await calendarService.getAvailability(
      "2025-05-04T00:00:00.000Z",
      "2025-05-04T23:59:59.000Z",
      selectedCalendars,
      true
    );
    expect(result).toEqual(mockedBusyTimes);
    expect(fetcherSpy).not.toHaveBeenCalledWith(expect.stringContaining("/$batch"));
    fetcherSpy.mockRestore();
  });
});

describe("Watching and unwatching calendar", () => {
  test("Calendar can be watched and unwatched", async () => {
    const credentialInDb = await createCredentialForCalendarService();
    const calendarService = new Office365CalendarService(credentialInDb);

    const fetcherSpy = vi
      .spyOn(calendarService, "fetcher" as any)
      .mockImplementation(defaultFetcherMockImplementation);

    await calendarService.watchCalendar({
      calendarId: testSelectedCalendar.externalId,
      eventTypeIds: [null],
    });
    expectOutlookSubscriptionToHaveOccurredAndClearMock(fetcherSpy);

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
    expectOutlookUnsubscriptionToHaveOccurredAndClearMock(fetcherSpy, ["mock-subscription-id"]);

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

    const fetcherSpy = vi
      .spyOn(calendarService, "fetcher" as any)
      .mockImplementation(defaultFetcherMockImplementation);

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

    const fetcherSpy = vi
      .spyOn(calendarService, "fetcher" as any)
      .mockImplementation(defaultFetcherMockImplementation);

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
    expectOutlookUnsubscriptionToHaveOccurredAndClearMock(fetcherSpy, ["mock-subscription-id"]);
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
        .mockImplementation(defaultFetcherMockImplementation);

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
        .mockImplementation(defaultFetcherMockImplementation);

      await calendarService.unwatchCalendar({
        calendarId: selectedCalendar.externalId,
        eventTypeIds: [null],
      });
      expectOutlookUnsubscriptionToHaveOccurredAndClearMock(fetcherSpy, ["mock-subscription-id"]);

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
      .mockImplementation(defaultFetcherMockImplementation);

    const availability = await calendarService.getAvailability(
      "2025-05-04T00:00:00Z",
      "2025-05-04T23:59:59Z",
      [],
      false,
      true
    );
    expect(availability).toEqual([{ start: "2025-05-04T10:00:00Z", end: "2025-05-04T11:00:00Z" }]);
    expect(fetcherSpy).toHaveBeenCalledWith(
      "/$batch",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"url":"/users/user@example.com/calendars/cal1/calendarView'),
      })
    );
    fetcherSpy.mockRestore();
  });
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
      .mockImplementation(defaultFetcherMockImplementation);

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

    const fetcherSpy = vi.spyOn(calendarService, "fetcher" as any).mockImplementation(async (endpoint) => {
      if (endpoint === "/me") return mockResponses.user();
      if (String(endpoint).includes("/$batch")) {
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
