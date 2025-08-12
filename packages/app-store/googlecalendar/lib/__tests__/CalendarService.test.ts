import prismock from "../../../../../tests/libs/__mocks__/prisma";
import oAuthManagerMock, {
  defaultMockOAuthManager,
  setFullMockOAuthManagerRequest,
} from "../../../tests/__mocks__/OAuthManager";
import "../__mocks__/features.repository";
import "../__mocks__/getGoogleAppKeys";
import {
  calendarMock,
  adminMock,
  setLastCreatedJWT,
  setCredentialsMock,
  setLastCreatedOAuth2Client,
  freebusyQueryMock,
  calendarListMock,
} from "../__mocks__/googleapis";

import { expect, test, beforeEach, vi, describe } from "vitest";
import "vitest-fetch-mock";

import { CalendarCache } from "@calcom/features/calendar-cache/calendar-cache";
import { getTimeMax, getTimeMin } from "@calcom/features/calendar-cache/lib/datesForCache";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";

import CalendarService from "../CalendarService";
import {
  createMockJWTInstance,
  createInMemoryDelegationCredentialForCalendarService,
  defaultDelegatedCredential,
  createCredentialForCalendarService,
  createInMemoryCredential,
} from "./utils";

const log = logger.getSubLogger({ prefix: ["CalendarService.test"] });

async function expectCacheToBeSet({
  credentialId,
  itemsInKey,
}: {
  credentialId: number;
  itemsInKey: { id: string }[];
}) {
  const caches = await prismock.calendarCache.findMany({
    where: {
      credentialId,
    },
  });
  expect(caches).toHaveLength(1);
  expect(JSON.parse(caches[0].key)).toEqual(
    expect.objectContaining({
      items: itemsInKey,
    })
  );
}

async function createSelectedCalendarForDelegationCredential(data: {
  userId: number;
  credentialId: number | null;
  delegationCredentialId: string;
  externalId: string;
  integration: string;
  googleChannelId: string | null;
  googleChannelKind: string | null;
  googleChannelResourceId: string | null;
  googleChannelResourceUri: string | null;
  googleChannelExpiration: string | null;
}) {
  if (!data.delegationCredentialId) {
    throw new Error("delegationCredentialId is required");
  }
  return await prismock.selectedCalendar.create({
    data: {
      ...data,
    },
  });
}

/**
 * The flow that sets CalendarCache must use CredentialForCalendarCache
 */

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

const testSelectedCalendar = {
  userId: 1,
  integration: "google_calendar",
  externalId: "example@cal.com",
};

const calendarCacheHelpers = {
  FUTURE_EXPIRATION_DATE: new Date(Date.now() + 100000000),
  getDatePair: () => {
    // Keep it small to not go to next month
    const timeDiffInMinutes = 1;
    const dateFrom = new Date(Date.now()).toISOString();
    const dateTo = new Date(Date.now() + timeDiffInMinutes * 60 * 1000).toISOString();
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

  setRegularCredentialCache: async ({
    credentialId,
    userId,
    key,
    value,
    expiresAt,
  }: {
    credentialId: number;
    userId: number;
    key: string;
    value: string;
    expiresAt: Date;
  }) => {
    await calendarCacheHelpers.setCache({
      credentialId,
      key,
      value,
      userId,
      expiresAt,
    });
  },
};

function expectGoogleSubscriptionToHaveOccurredAndClearMock({ calendarId }: { calendarId: string }) {
  expect(calendarMock.calendar_v3.Calendar().events.watch).toHaveBeenCalledTimes(1);
  expect(calendarMock.calendar_v3.Calendar().events.watch).toHaveBeenCalledWith(
    expect.objectContaining({
      calendarId,
      requestBody: expect.objectContaining({
        type: "web_hook",
        token: process.env.GOOGLE_WEBHOOK_TOKEN,
      }),
    })
  );
  calendarMock.calendar_v3.Calendar().events.watch.mockClear();
}

function expectGoogleSubscriptionToNotHaveOccurredAndClearMock() {
  expect(calendarMock.calendar_v3.Calendar().events.watch).not.toHaveBeenCalled();
  calendarMock.calendar_v3.Calendar().events.watch.mockClear();
}

function expectGoogleUnsubscriptionToHaveOccurredAndClearMock(
  channels: {
    resourceId: string;
    channelId: string;
  }[]
) {
  expect(calendarMock.calendar_v3.Calendar().channels.stop).toHaveBeenCalledTimes(1);
  channels.forEach((channel) => {
    expect(calendarMock.calendar_v3.Calendar().channels.stop).toHaveBeenCalledWith({
      requestBody: {
        resourceId: channel.resourceId,
        id: channel.channelId,
      },
    });
  });
  calendarMock.calendar_v3.Calendar().channels.stop.mockClear();
}

function expectGoogleUnsubscriptionToNotHaveOccurredAndClearMock() {
  expect(calendarMock.calendar_v3.Calendar().channels.stop).not.toHaveBeenCalled();
  calendarMock.calendar_v3.Calendar().channels.stop.mockClear();
}

async function expectSelectedCalendarToHaveGoogleChannelProps(
  id: string,
  googleChannelProps: {
    googleChannelId: string;
    googleChannelKind: string;
    googleChannelResourceId: string;
    googleChannelResourceUri: string;
    googleChannelExpiration: string;
  }
) {
  const selectedCalendar = await SelectedCalendarRepository.findById(id);

  expect(selectedCalendar).toEqual(expect.objectContaining(googleChannelProps));
}

async function expectSelectedCalendarToNotHaveGoogleChannelProps(selectedCalendarId: string) {
  const selectedCalendar = await SelectedCalendarRepository.findFirst({
    where: {
      id: selectedCalendarId,
    },
  });

  expect(selectedCalendar).toEqual(
    expect.objectContaining({
      googleChannelId: null,
      googleChannelKind: null,
      googleChannelResourceId: null,
      googleChannelResourceUri: null,
      googleChannelExpiration: null,
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setCredentialsMock.mockClear();
  oAuthManagerMock.OAuthManager = defaultMockOAuthManager;
  calendarMock.calendar_v3.Calendar.mockClear();
  adminMock.admin_directory_v1.Admin.mockClear();

  setLastCreatedJWT(null);
  setLastCreatedOAuth2Client(null);
  createMockJWTInstance({});
});

describe("Calendar Cache", () => {
  test("Calendar Cache is being read on cache HIT", async () => {
    const credentialInDb1 = await createCredentialForCalendarService();
    const dateFrom1 = new Date().toISOString();
    const dateTo1 = new Date().toISOString();

    // Create cache
    const calendarCache = await CalendarCache.init(null);
    await calendarCache.upsertCachedAvailability({
      credentialId: credentialInDb1.id,
      userId: credentialInDb1.userId,
      args: {
        timeMin: getTimeMin(dateFrom1),
        timeMax: getTimeMax(dateTo1),
        items: [{ id: testSelectedCalendar.externalId }],
      },
      value: JSON.parse(
        JSON.stringify({
          calendars: [
            {
              busy: [
                {
                  start: "2023-12-01T18:00:00Z",
                  end: "2023-12-01T19:00:00Z",
                },
              ],
            },
          ],
        })
      ),
    });

    oAuthManagerMock.OAuthManager = defaultMockOAuthManager;
    const calendarService = new CalendarService(credentialInDb1);

    // Test cache hit
    const data = await calendarService.getAvailability(dateFrom1, dateTo1, [testSelectedCalendar]);
    expect(data).toEqual([
      {
        start: "2023-12-01T18:00:00Z",
        end: "2023-12-01T19:00:00Z",
      },
    ]);
  });

  test("Cache HIT: Should avoid Google API calls when cache is available", async () => {
    const credentialInDb = await createCredentialForCalendarService();
    const calendarService = new CalendarService(credentialInDb);

    const dateFrom = new Date().toISOString();
    const dateTo = new Date().toISOString();

    // Set up cache with test data
    const calendarCache = await CalendarCache.init(null);
    await calendarCache.upsertCachedAvailability({
      credentialId: credentialInDb.id,
      userId: credentialInDb.userId,
      args: {
        timeMin: getTimeMin(dateFrom),
        timeMax: getTimeMax(dateTo),
        items: [{ id: testSelectedCalendar.externalId }],
      },
      value: {
        calendars: {
          [testSelectedCalendar.externalId]: {
            busy: [
              {
                start: "2023-12-01T18:00:00Z",
                end: "2023-12-01T19:00:00Z",
              },
            ],
          },
        },
      },
    });

    // Spy on Google API methods that should NOT be called on cache hit
    const authedCalendarSpy = vi.spyOn(calendarService, "authedCalendar");
    const getAllCalendarsSpy = vi.spyOn(calendarService, "getAllCalendars");
    const fetchAvailabilitySpy = vi.spyOn(calendarService, "fetchAvailability");

    // Call getAvailability with selected calendars (should hit cache)
    const result = await calendarService.getAvailability(dateFrom, dateTo, [testSelectedCalendar], true);

    // Verify cache hit returned correct data
    expect(result).toEqual([
      {
        start: "2023-12-01T18:00:00Z",
        end: "2023-12-01T19:00:00Z",
      },
    ]);

    // Verify NO Google API calls were made
    expect(authedCalendarSpy).not.toHaveBeenCalled();
    expect(getAllCalendarsSpy).not.toHaveBeenCalled();
    expect(fetchAvailabilitySpy).not.toHaveBeenCalled();

    // Clean up spies
    authedCalendarSpy.mockRestore();
    getAllCalendarsSpy.mockRestore();
    fetchAvailabilitySpy.mockRestore();
  });

  test("Cache MISS: Should make Google API calls when cache is not available", async () => {
    const credentialInDb = await createCredentialForCalendarService();
    const calendarService = new CalendarService(credentialInDb);
    setFullMockOAuthManagerRequest();

    const dateFrom = new Date().toISOString();
    const dateTo = new Date(Date.now() + 100000000).toISOString(); // Different date to ensure cache miss

    // Mock Google API responses
    freebusyQueryMock.mockResolvedValueOnce({
      data: {
        calendars: {
          [testSelectedCalendar.externalId]: {
            busy: [
              {
                start: "2023-12-01T10:00:00Z",
                end: "2023-12-01T11:00:00Z",
              },
            ],
          },
        },
      },
    });

    // Spy on Google API methods that SHOULD be called on cache miss
    const authedCalendarSpy = vi.spyOn(calendarService, "authedCalendar");
    const fetchAvailabilitySpy = vi.spyOn(calendarService, "fetchAvailability");

    // Call getAvailability with selected calendars (should miss cache)
    const result = await calendarService.getAvailability(dateFrom, dateTo, [testSelectedCalendar], true);

    // Verify API call returned correct data
    expect(result).toEqual([
      {
        start: "2023-12-01T10:00:00Z",
        end: "2023-12-01T11:00:00Z",
      },
    ]);

    // Verify Google API calls WERE made
    expect(authedCalendarSpy).toHaveBeenCalled();
    expect(fetchAvailabilitySpy).toHaveBeenCalled();

    // Clean up spies
    authedCalendarSpy.mockRestore();
    fetchAvailabilitySpy.mockRestore();
  });

  test("Cache DISABLED: Should bypass cache when shouldServeCache=false", async () => {
    const credentialInDb = await createCredentialForCalendarService();
    const calendarService = new CalendarService(credentialInDb);
    setFullMockOAuthManagerRequest();

    const dateFrom = new Date().toISOString();
    const dateTo = new Date().toISOString();

    // Set up cache with test data
    const calendarCache = await CalendarCache.init(null);
    await calendarCache.upsertCachedAvailability({
      credentialId: credentialInDb.id,
      userId: credentialInDb.userId,
      args: {
        timeMin: getTimeMin(dateFrom),
        timeMax: getTimeMax(dateTo),
        items: [{ id: testSelectedCalendar.externalId }],
      },
      value: {
        calendars: {
          [testSelectedCalendar.externalId]: {
            busy: [
              {
                start: "2023-12-01T18:00:00Z",
                end: "2023-12-01T19:00:00Z",
              },
            ],
          },
        },
      },
    });

    // Mock Google API to return different data than cache
    freebusyQueryMock.mockResolvedValueOnce({
      data: {
        calendars: {
          [testSelectedCalendar.externalId]: {
            busy: [
              {
                start: "2023-12-01T20:00:00Z",
                end: "2023-12-01T21:00:00Z",
              },
            ],
          },
        },
      },
    });

    // Spy on Google API methods
    const authedCalendarSpy = vi.spyOn(calendarService, "authedCalendar");
    const fetchAvailabilitySpy = vi.spyOn(calendarService, "fetchAvailability");

    // Call getAvailability with shouldServeCache=false (should bypass cache)
    const result = await calendarService.getAvailability(dateFrom, dateTo, [testSelectedCalendar], false);

    // Verify API data was returned (not cache data)
    expect(result).toEqual([
      {
        start: "2023-12-01T20:00:00Z",
        end: "2023-12-01T21:00:00Z",
      },
    ]);

    // Verify Google API calls WERE made even though cache existed
    expect(authedCalendarSpy).toHaveBeenCalled();
    expect(fetchAvailabilitySpy).toHaveBeenCalled();

    // Clean up spies
    authedCalendarSpy.mockRestore();
    fetchAvailabilitySpy.mockRestore();
  });

  test("NO SELECTED CALENDARS: Should skip cache logic when no selectedCalendarIds", async () => {
    const credentialInDb = await createCredentialForCalendarService();
    const calendarService = new CalendarService(credentialInDb);
    setFullMockOAuthManagerRequest();

    const dateFrom = new Date().toISOString();
    const dateTo = new Date().toISOString();

    // Mock Google API response for fallback scenario
    calendarListMock.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: "primary@example.com",
            primary: true,
          },
        ],
      },
    });

    freebusyQueryMock.mockResolvedValueOnce({
      data: {
        calendars: {
          "primary@example.com": {
            busy: [
              {
                start: "2023-12-01T12:00:00Z",
                end: "2023-12-01T13:00:00Z",
              },
            ],
          },
        },
      },
    });

    // Spy on cache method that should NOT be called
    const tryGetAvailabilityFromCacheSpy = vi.spyOn(calendarService, "tryGetAvailabilityFromCache" as any);

    // Spy on Google API methods that SHOULD be called
    const authedCalendarSpy = vi.spyOn(calendarService, "authedCalendar");
    const getAllCalendarsSpy = vi.spyOn(calendarService, "getAllCalendars");

    // Call getAvailability with empty selectedCalendars but fallbackToPrimary=true
    const result = await calendarService.getAvailability(dateFrom, dateTo, [], true, true);

    // Verify fallback logic worked
    expect(result).toEqual([
      {
        start: "2023-12-01T12:00:00Z",
        end: "2023-12-01T13:00:00Z",
      },
    ]);

    // Verify cache was NOT checked
    expect(tryGetAvailabilityFromCacheSpy).not.toHaveBeenCalled();

    // Verify Google API calls WERE made for fallback logic
    expect(authedCalendarSpy).toHaveBeenCalled();
    expect(getAllCalendarsSpy).toHaveBeenCalled();

    // Clean up spies
    tryGetAvailabilityFromCacheSpy.mockRestore();
    authedCalendarSpy.mockRestore();
    getAllCalendarsSpy.mockRestore();
  });

  test("CACHE ERROR: Should handle cache errors gracefully and fall back to API", async () => {
    const credentialInDb = await createCredentialForCalendarService();
    const calendarService = new CalendarService(credentialInDb);
    setFullMockOAuthManagerRequest();

    const dateFrom = new Date().toISOString();
    const dateTo = new Date().toISOString();

    // Mock cache to throw an error
    const mockCalendarCache = {
      getCachedAvailability: vi.fn().mockRejectedValueOnce(new Error("Cache error")),
    };
    vi.spyOn(CalendarCache, "init").mockResolvedValueOnce(mockCalendarCache as any);

    // Mock Google API response
    freebusyQueryMock.mockResolvedValueOnce({
      data: {
        calendars: {
          [testSelectedCalendar.externalId]: {
            busy: [
              {
                start: "2023-12-01T14:00:00Z",
                end: "2023-12-01T15:00:00Z",
              },
            ],
          },
        },
      },
    });

    // Spy on Google API methods that SHOULD be called on cache error
    const authedCalendarSpy = vi.spyOn(calendarService, "authedCalendar");
    const fetchAvailabilitySpy = vi.spyOn(calendarService, "fetchAvailability");

    // Call getAvailability (cache should fail, API should be called)
    const result = await calendarService.getAvailability(dateFrom, dateTo, [testSelectedCalendar], true);

    // Verify API fallback worked
    expect(result).toEqual([
      {
        start: "2023-12-01T14:00:00Z",
        end: "2023-12-01T15:00:00Z",
      },
    ]);

    // Verify Google API calls WERE made due to cache error
    expect(authedCalendarSpy).toHaveBeenCalled();
    expect(fetchAvailabilitySpy).toHaveBeenCalled();

    // Clean up spies
    authedCalendarSpy.mockRestore();
    fetchAvailabilitySpy.mockRestore();
  });

  test("OTHER INTEGRATIONS ONLY: Should return empty array without cache or API calls", async () => {
    const credentialInDb = await createCredentialForCalendarService();
    const calendarService = new CalendarService(credentialInDb);

    const dateFrom = new Date().toISOString();
    const dateTo = new Date().toISOString();

    // Spy on methods that should NOT be called
    const tryGetAvailabilityFromCacheSpy = vi.spyOn(calendarService, "tryGetAvailabilityFromCache" as any);
    const authedCalendarSpy = vi.spyOn(calendarService, "authedCalendar");

    // Call getAvailability with only other integration calendars
    const result = await calendarService.getAvailability(
      dateFrom,
      dateTo,
      [
        {
          integration: "outlook_calendar", // Different integration
          externalId: "other@example.com",
        },
      ],
      true
    );

    // Verify early return with empty array
    expect(result).toEqual([]);

    // Verify NO cache or API calls were made
    expect(tryGetAvailabilityFromCacheSpy).not.toHaveBeenCalled();
    expect(authedCalendarSpy).not.toHaveBeenCalled();

    // Clean up spies
    tryGetAvailabilityFromCacheSpy.mockRestore();
    authedCalendarSpy.mockRestore();
  });

  test("Calendar Cache is being ignored on cache MISS", async () => {
    const calendarCache = await CalendarCache.init(null);
    const credentialInDb = await createCredentialForCalendarService();
    const dateFrom = new Date(Date.now()).toISOString();
    // Tweak date so that it's a cache miss
    const dateTo = new Date(Date.now() + 100000000).toISOString();
    const calendarService = new CalendarService(credentialInDb);

    // Test Cache Miss
    await calendarService.getAvailability(dateFrom, dateTo, [testSelectedCalendar]);

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
  });

  test("fetchAvailabilityAndSetCache should fetch and cache availability for selected calendars grouped by eventTypeId", async () => {
    const credentialInDb = await createCredentialForCalendarService();
    const calendarService = new CalendarService(credentialInDb);

    const selectedCalendars = [
      {
        externalId: "calendar1@test.com",
        eventTypeId: 1,
      },
      {
        externalId: "calendar2@test.com",
        eventTypeId: 1,
      },
      {
        externalId: "calendar1@test.com",
        eventTypeId: 2,
      },
      {
        externalId: "calendar1@test.com",
        eventTypeId: null,
      },
      {
        externalId: "calendar2@test.com",
        eventTypeId: null,
      },
    ];

    const mockAvailabilityData = { busy: [] };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(calendarService, "fetchAvailability").mockResolvedValue(mockAvailabilityData as any);
    const setAvailabilityInCacheSpy = vi.spyOn(calendarService, "setAvailabilityInCache");

    await calendarService.fetchAvailabilityAndSetCache(selectedCalendars);

    // Should make 2 calls - one for each unique eventTypeId
    expect(calendarService.fetchAvailability).toHaveBeenCalledTimes(3);

    // First call for eventTypeId 1 calendars
    expect(calendarService.fetchAvailability).toHaveBeenNthCalledWith(1, {
      timeMin: expect.any(String),
      timeMax: expect.any(String),
      items: [{ id: "calendar1@test.com" }, { id: "calendar2@test.com" }],
    });

    // Second call for eventTypeId 2 calendar
    expect(calendarService.fetchAvailability).toHaveBeenNthCalledWith(2, {
      timeMin: expect.any(String),
      timeMax: expect.any(String),
      items: [{ id: "calendar1@test.com" }],
    });

    // Second call for eventTypeId 2 calendar
    expect(calendarService.fetchAvailability).toHaveBeenNthCalledWith(3, {
      timeMin: expect.any(String),
      timeMax: expect.any(String),
      items: [{ id: "calendar1@test.com" }, { id: "calendar2@test.com" }],
    });

    // Should cache results for both calls
    expect(setAvailabilityInCacheSpy).toHaveBeenCalledTimes(3);
    expect(setAvailabilityInCacheSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.any(Array),
      }),
      mockAvailabilityData
    );
  });

  test("A cache set through fetchAvailabilityAndSetCache should be used when doing getAvailability", async () => {
    const credentialInDb = await createCredentialForCalendarService();
    const calendarService = new CalendarService(credentialInDb);
    vi.setSystemTime(new Date("2025-04-01T00:00:00.000Z"));
    setFullMockOAuthManagerRequest();
    const selectedCalendars = [
      {
        externalId: "calendar1@test.com",
        integration: "google_calendar",
        eventTypeId: null,
        credentialId: credentialInDb.id,
        userId: credentialInDb.userId!,
      },
    ];

    const mockedBusyTimes = [{ end: "2025-04-02T18:30:00Z", start: "2025-04-01T18:30:00Z" }];
    // Mock Once so that the getAvailability call doesn't accidentally reuse this mock result
    freebusyQueryMock.mockResolvedValueOnce({
      data: {
        calendars: {
          "calendar1@test.com": {
            busy: mockedBusyTimes,
          },
        },
      },
    });

    const calendarCachesBefore = await prismock.calendarCache.findMany();
    expect(calendarCachesBefore).toHaveLength(0);
    await calendarService.fetchAvailabilityAndSetCache(selectedCalendars);
    const calendarCachesAfter = await prismock.calendarCache.findMany();
    console.log({ calendarCachesAfter });
    expect(calendarCachesAfter).toHaveLength(1);
    const datesForWhichCachedAvailabilityIsUsed = [
      {
        dateFrom: "2025-04-01T00:00:00.000Z",
        dateTo: "2025-06-01T00:00:00.000Z",
      },
      // Add more dates for which cached availability should be used
      // {
      //   dateFrom: "2025-04-01T00:00:00.000Z",
      //   dateTo: "2025-04-30T00:00:00.000Z",
      // },
    ];
    try {
      for (const { dateFrom, dateTo } of datesForWhichCachedAvailabilityIsUsed) {
        const result = await calendarService.getAvailability(dateFrom, dateTo, selectedCalendars, true);
        expect(result).toEqual(mockedBusyTimes);
      }
    } catch (error) {
      console.log({ error });
      throw "Looks like cache was not used";
    }

    // The following is not working because getBusyCalendarTimes expands the date range a bit.
    // const busyCalendarTimesResult = await getBusyCalendarTimes(
    //   [credentialInDb],
    //   "2025-04-01T00:00:00.000Z",
    //   "2025-04-30T00:00:00.000Z",
    //   selectedCalendars,
    //   true
    // );

    // expect(busyCalendarTimesResult).toEqual(mockedBusyTimes);
  });
});

describe("Watching and unwatching calendar", () => {
  test("Calendar can be watched and unwatched", async () => {
    const credentialInDb1 = await createCredentialForCalendarService();
    const calendarService = new CalendarService(credentialInDb1);

    await calendarService.watchCalendar({
      calendarId: testSelectedCalendar.externalId,
      eventTypeIds: [null],
    });

    // Watching a non-existent selectedCalendar creates it
    const watchedCalendar = await prismock.selectedCalendar.findFirst({
      where: {
        userId: credentialInDb1.userId!,
        externalId: testSelectedCalendar.externalId,
        integration: "google_calendar",
      },
    });

    expect(watchedCalendar).toEqual(
      expect.objectContaining({
        userId: 1,
        eventTypeId: null,
        integration: "google_calendar",
        externalId: "example@cal.com",
        credentialId: 1,
        delegationCredentialId: null,
        googleChannelId: "mock-channel-id",
        googleChannelKind: "api#channel",
        googleChannelResourceId: "mock-resource-id",
        googleChannelResourceUri: "mock-resource-uri",
        googleChannelExpiration: "1111111111",
      })
    );

    expect(watchedCalendar?.id).toBeDefined();

    await calendarService.unwatchCalendar({
      calendarId: testSelectedCalendar.externalId,
      eventTypeIds: [null],
    });
    const calendarAfterUnwatch = await prismock.selectedCalendar.findFirst({
      where: {
        userId: credentialInDb1.userId!,
        externalId: testSelectedCalendar.externalId,
        integration: "google_calendar",
      },
    });

    expect(calendarAfterUnwatch).toEqual(
      expect.objectContaining({
        userId: 1,
        eventTypeId: null,
        integration: "google_calendar",
        externalId: "example@cal.com",
        credentialId: 1,
        delegationCredentialId: null,
        googleChannelId: null,
        googleChannelKind: null,
        googleChannelResourceId: null,
        googleChannelResourceUri: null,
        googleChannelExpiration: null,
      })
    );
    expect(calendarAfterUnwatch?.id).toBeDefined();
  });

  describe("Delegation Credential", () => {
    test("On watching a SelectedCalendar having delegationCredential, it should set googleChannelId and other props", async () => {
      const delegationCredential1Member1 = await createInMemoryDelegationCredentialForCalendarService({
        user: { email: "user1@example.com" },
        delegationCredentialId: "delegation-credential-id-1",
      });

      await prismock.selectedCalendar.create({
        data: {
          userId: delegationCredential1Member1.userId!,
          externalId: testSelectedCalendar.externalId,
          integration: "google_calendar",
        },
      });

      const calendarService = new CalendarService(delegationCredential1Member1);
      await calendarService.watchCalendar({
        calendarId: testSelectedCalendar.externalId,
        eventTypeIds: [null],
      });

      expectGoogleSubscriptionToHaveOccurredAndClearMock({
        calendarId: testSelectedCalendar.externalId,
      });

      const calendars = await prismock.selectedCalendar.findMany();
      // Ensure no new calendar is created
      expect(calendars).toHaveLength(1);
      const watchedCalendar = calendars[0];

      await expectSelectedCalendarToHaveGoogleChannelProps(watchedCalendar.id, {
        googleChannelId: "mock-channel-id",
        googleChannelKind: "api#channel",
        googleChannelResourceId: "mock-resource-id",
        googleChannelResourceUri: "mock-resource-uri",
        googleChannelExpiration: "1111111111",
      });
    });

    test("On unwatching a SelectedCalendar connected to Delegation Credential, it should remove googleChannelId and other props", async () => {
      const delegationCredential1Member1 = await createDelegationCredentialForCalendarCache({
        user: { email: "user1@example.com" },
        delegationCredentialId: "delegation-credential-id-1",
      });

      const selectedCalendar = await createSelectedCalendarForDelegationCredential({
        userId: delegationCredential1Member1.userId!,
        delegationCredentialId: delegationCredential1Member1.delegatedToId!,
        credentialId: delegationCredential1Member1.id,
        externalId: testSelectedCalendar.externalId,
        integration: "google_calendar",
        googleChannelId: "mock-channel-id",
        googleChannelKind: "api#channel",
        googleChannelResourceId: "mock-resource-id",
        googleChannelResourceUri: "mock-resource-uri",
        googleChannelExpiration: "1111111111",
      });

      const calendarService = new CalendarService(delegationCredential1Member1);
      await calendarService.unwatchCalendar({
        calendarId: selectedCalendar.externalId,
        eventTypeIds: [null],
      });

      expectGoogleUnsubscriptionToHaveOccurredAndClearMock([
        {
          resourceId: "mock-resource-id",
          channelId: "mock-channel-id",
        },
      ]);

      const calendars = await prismock.selectedCalendar.findMany();
      expect(calendars).toHaveLength(1);
      const calendarAfterUnwatch = calendars[0];

      expectSelectedCalendarToNotHaveGoogleChannelProps(calendarAfterUnwatch.id);
    });
  });

  test("watchCalendar should not do google subscription if already subscribed for the same calendarId", async () => {
    const credentialInDb1 = await createCredentialForCalendarService();
    const calendarCache = await CalendarCache.initFromCredentialId(credentialInDb1.id);
    const userLevelCalendar = await SelectedCalendarRepository.create({
      userId: credentialInDb1.userId!,
      externalId: "externalId@cal.com",
      integration: "google_calendar",
      eventTypeId: null,
      credentialId: credentialInDb1.id,
    });

    const eventTypeLevelCalendar = await SelectedCalendarRepository.create({
      userId: credentialInDb1.userId!,
      externalId: "externalId@cal.com",
      integration: "google_calendar",
      eventTypeId: 1,
      credentialId: credentialInDb1.id,
    });

    await calendarCache.watchCalendar({
      calendarId: userLevelCalendar.externalId,
      eventTypeIds: [userLevelCalendar.eventTypeId],
    });

    expectGoogleSubscriptionToHaveOccurredAndClearMock({
      calendarId: userLevelCalendar.externalId,
    });

    await expectSelectedCalendarToHaveGoogleChannelProps(userLevelCalendar.id, {
      googleChannelId: "mock-channel-id",
      googleChannelKind: "api#channel",
      googleChannelResourceId: "mock-resource-id",
      googleChannelResourceUri: "mock-resource-uri",
      googleChannelExpiration: "1111111111",
    });

    // Watch different selectedcalendar with same externalId and credentialId
    await calendarCache.watchCalendar({
      calendarId: eventTypeLevelCalendar.externalId,
      eventTypeIds: [eventTypeLevelCalendar.eventTypeId],
    });

    expectGoogleSubscriptionToNotHaveOccurredAndClearMock();
    // Google Subscription didn't occur but still the eventTypeLevelCalendar has the same googleChannelProps
    await expectSelectedCalendarToHaveGoogleChannelProps(eventTypeLevelCalendar.id, {
      googleChannelId: "mock-channel-id",
      googleChannelKind: "api#channel",
      googleChannelResourceId: "mock-resource-id",
      googleChannelResourceUri: "mock-resource-uri",
      googleChannelExpiration: "1111111111",
    });
  });

  test("watchCalendar should do google subscription if already subscribed but for different calendarId", async () => {
    const credentialInDb1 = await createCredentialForCalendarService();
    const calendarCache = await CalendarCache.initFromCredentialId(credentialInDb1.id);
    const userLevelCalendar = await SelectedCalendarRepository.create({
      userId: credentialInDb1.userId!,
      externalId: "externalId@cal.com",
      integration: "google_calendar",
      eventTypeId: null,
      credentialId: credentialInDb1.id,
    });

    const eventTypeLevelCalendar = await SelectedCalendarRepository.create({
      userId: credentialInDb1.userId!,
      externalId: "externalId2@cal.com",
      integration: "google_calendar",
      eventTypeId: 1,
      credentialId: credentialInDb1.id,
    });

    await calendarCache.watchCalendar({
      calendarId: userLevelCalendar.externalId,
      eventTypeIds: [userLevelCalendar.eventTypeId],
    });

    expectGoogleSubscriptionToHaveOccurredAndClearMock({
      calendarId: userLevelCalendar.externalId,
    });

    await expectSelectedCalendarToHaveGoogleChannelProps(userLevelCalendar.id, {
      googleChannelId: "mock-channel-id",
      googleChannelKind: "api#channel",
      googleChannelResourceId: "mock-resource-id",
      googleChannelResourceUri: "mock-resource-uri",
      googleChannelExpiration: "1111111111",
    });

    // Watch different selectedcalendar with same externalId and credentialId
    await calendarCache.watchCalendar({
      calendarId: eventTypeLevelCalendar.externalId,
      eventTypeIds: [eventTypeLevelCalendar.eventTypeId],
    });

    expectGoogleSubscriptionToHaveOccurredAndClearMock({
      calendarId: eventTypeLevelCalendar.externalId,
    });

    // Google Subscription didn't occur but still the eventTypeLevelCalendar has the same googleChannelProps
    await expectSelectedCalendarToHaveGoogleChannelProps(eventTypeLevelCalendar.id, {
      googleChannelId: "mock-channel-id",
      googleChannelKind: "api#channel",
      googleChannelResourceId: "mock-resource-id",
      googleChannelResourceUri: "mock-resource-uri",
      googleChannelExpiration: "1111111111",
    });
  });

  test("unwatchCalendar should not unsubscribe from google if there is another selectedCalendar with same externalId and credentialId", async () => {
    const credentialInDb1 = await createCredentialForCalendarService();
    const calendarCache = await CalendarCache.initFromCredentialId(credentialInDb1.id);

    await prismock.calendarCache.create({
      data: {
        key: "test-key",
        value: "test-value",
        expiresAt: new Date(Date.now() + 100000000),
        credentialId: credentialInDb1.id,
      },
    });

    const someOtherCache = await prismock.calendarCache.create({
      data: {
        key: JSON.stringify({
          items: [{ id: "someOtherExternalId@cal.com" }],
        }),
        value: "test-value-2",
        expiresAt: new Date(Date.now() + 100000000),
        credentialId: 999,
      },
    });

    const googleChannelProps = {
      googleChannelId: "test-channel-id",
      googleChannelKind: "api#channel",
      googleChannelResourceId: "test-resource-id",
      googleChannelResourceUri: "test-resource-uri",
      googleChannelExpiration: "1111111111",
    };

    const commonProps = {
      userId: credentialInDb1.userId!,
      externalId: "externalId@cal.com",
      integration: "google_calendar",
      credentialId: credentialInDb1.id,
      ...googleChannelProps,
    };

    const userLevelCalendar = await SelectedCalendarRepository.create({
      ...commonProps,
      eventTypeId: null,
    });

    const eventTypeLevelCalendar = await SelectedCalendarRepository.create({
      ...commonProps,
      eventTypeId: 1,
    });

    const eventTypeLevelCalendarForSomeOtherExternalIdButSameCredentialId =
      await SelectedCalendarRepository.create({
        ...commonProps,
        externalId: "externalId2@cal.com",
        eventTypeId: 2,
      });

    await calendarCache.unwatchCalendar({
      calendarId: userLevelCalendar.externalId,
      eventTypeIds: [userLevelCalendar.eventTypeId],
    });
    // There is another selectedCalendar with same externalId and credentialId, so actual unsubscription does not happen
    expectGoogleUnsubscriptionToNotHaveOccurredAndClearMock();
    await expectSelectedCalendarToNotHaveGoogleChannelProps(userLevelCalendar.id);

    await calendarCache.unwatchCalendar({
      calendarId: eventTypeLevelCalendar.externalId,
      eventTypeIds: [eventTypeLevelCalendar.eventTypeId],
    });

    expectGoogleUnsubscriptionToHaveOccurredAndClearMock([
      {
        resourceId: "test-resource-id",
        channelId: "test-channel-id",
      },
    ]);

    // Concerned cache will just have remaining externalIds
    await expectCacheToBeSet({
      credentialId: credentialInDb1.id,
      itemsInKey: [{ id: eventTypeLevelCalendarForSomeOtherExternalIdButSameCredentialId.externalId }],
    });

    await expectCacheToBeSet({
      credentialId: someOtherCache.credentialId,
      itemsInKey: JSON.parse(someOtherCache.key).items,
    });

    await expectSelectedCalendarToNotHaveGoogleChannelProps(eventTypeLevelCalendar.id);

    // Some other selectedCalendar stays unaffected
    await expectSelectedCalendarToHaveGoogleChannelProps(
      eventTypeLevelCalendarForSomeOtherExternalIdButSameCredentialId.id,
      googleChannelProps
    );
  });
});

describe("getAvailability", () => {
  test("returns availability for selected calendars", async () => {
    const credential = await createCredentialForCalendarService();
    const calendarService = new CalendarService(credential);
    setFullMockOAuthManagerRequest();
    const mockedBusyTimes1 = [
      {
        start: "2024-01-01",
        end: "2024-01-02",
      },
    ];
    const mockedBusyTimes2 = [
      {
        start: "2024-01-03",
        end: "2024-01-04",
      },
    ];

    const mockedBusyTimes = [mockedBusyTimes1, mockedBusyTimes2];
    calendarListMock.mockImplementation(() => {
      return {
        data: {
          items: [
            {
              id: "calendar1@test.com",
            },
            {
              id: "calendar2@test.com",
            },
          ],
        },
      };
    });
    // Mock Once so that the getAvailability call doesn't accidentally reuse this mock result
    freebusyQueryMock.mockImplementation(({ requestBody }: { requestBody: any }) => {
      const calendarsObject: any = {};
      requestBody.items.forEach((item: any, index: number) => {
        calendarsObject[item.id] = {
          busy: mockedBusyTimes[index],
        };
      });
      return {
        data: {
          calendars: calendarsObject,
        },
      };
    });

    const availabilityWithPrimaryAsFallback = await calendarService.getAvailability(
      "2024-01-01",
      "2024-01-02",
      [],
      false,
      true
    );

    expect(availabilityWithPrimaryAsFallback).toEqual(mockedBusyTimes1);

    const availabilityWithAllCalendarsAsFallback = await calendarService.getAvailability(
      "2024-01-01",
      "2024-01-02",
      [],
      false,
      false
    );

    expect(availabilityWithAllCalendarsAsFallback).toEqual([...mockedBusyTimes1, ...mockedBusyTimes2]);
  });
});

describe("getPrimaryCalendar", () => {
  test("should fetch primary calendar using 'primary' keyword", async () => {
    const credential = await createCredentialForCalendarService();
    const calendarService = new CalendarService(credential);
    setFullMockOAuthManagerRequest();
    const mockPrimaryCalendar = {
      id: "user@example.com",
      summary: "Primary Calendar",
      description: "Primary calendar for user@example.com",
      timeZone: "America/New_York",
    };
    const calendarsGetMock = vi.fn().mockResolvedValue({
      data: mockPrimaryCalendar,
    });
    calendarMock.calendar_v3.Calendar().calendars.get = calendarsGetMock;
    const result = await calendarService.getPrimaryCalendar();
    expect(calendarsGetMock).toHaveBeenCalledTimes(1);
    expect(calendarsGetMock).toHaveBeenCalledWith({
      calendarId: "primary",
    });
    expect(result).toEqual(mockPrimaryCalendar);
  });
});

describe("Date Optimization Benchmarks", () => {
  test("native Date calculations should be significantly faster than dayjs while producing identical results", async () => {
    const dayjs = (await import("@calcom/dayjs")).default;

    const testCases = [
      {
        dateFrom: "2024-01-01T00:00:00Z",
        dateTo: "2024-01-31T00:00:00Z",
        name: "30 days",
        expectedDiff: 30,
      },
      {
        dateFrom: "2024-01-01T00:00:00Z",
        dateTo: "2024-03-31T00:00:00Z",
        name: "90 days (API limit)",
        expectedDiff: 90,
      },
      {
        dateFrom: "2024-01-01T00:00:00Z",
        dateTo: "2024-07-01T00:00:00Z",
        name: "182 days (chunking required)",
        expectedDiff: 182,
      },
    ];

    const iterations = 1000; // Reduced for test performance

    for (const testCase of testCases) {
      log.info(`Testing ${testCase.name}...`);

      // Test correctness first
      const dayjsDiff = dayjs(testCase.dateTo).diff(dayjs(testCase.dateFrom), "days");
      const nativeDiff = Math.floor(
        (new Date(testCase.dateTo).getTime() - new Date(testCase.dateFrom).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Verify identical results
      expect(nativeDiff).toBe(dayjsDiff);
      expect(nativeDiff).toBe(testCase.expectedDiff);

      // Performance test - dayjs approach
      const dayjsStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const start = dayjs(testCase.dateFrom);
        const end = dayjs(testCase.dateTo);
        const diff = end.diff(start, "days");
      }
      const dayjsTime = performance.now() - dayjsStart;

      // Performance test - native Date approach
      const nativeStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const start = new Date(testCase.dateFrom);
        const end = new Date(testCase.dateTo);
        const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      }
      const nativeTime = performance.now() - nativeStart;

      const speedupRatio = dayjsTime / nativeTime;

      log.info(
        `${testCase.name} - Dayjs: ${dayjsTime.toFixed(2)}ms, Native: ${nativeTime.toFixed(
          2
        )}ms, Speedup: ${speedupRatio.toFixed(1)}x`
      );

      // Assert significant performance improvement (at least 5x faster)
      expect(speedupRatio).toBeGreaterThan(5);
    }
  });

  test("chunking logic should produce identical results between dayjs and native Date implementations", async () => {
    const dayjs = (await import("@calcom/dayjs")).default;

    const testCases = [
      {
        dateFrom: "2024-01-01T00:00:00Z",
        dateTo: "2024-04-01T00:00:00Z", // 91 days - requires chunking
        name: "91 days (minimal chunking)",
      },
      {
        dateFrom: "2024-01-01T00:00:00Z",
        dateTo: "2024-07-01T00:00:00Z", // 182 days - multiple chunks
        name: "182 days (multiple chunks)",
      },
    ];

    for (const testCase of testCases) {
      const fromDate = new Date(testCase.dateFrom);
      const toDate = new Date(testCase.dateTo);
      const diff = Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));

      // Only test cases that require chunking (> 90 days)
      if (diff <= 90) continue;

      // OLD WAY (dayjs-based chunking)
      const originalStartDate = dayjs(testCase.dateFrom);
      const originalEndDate = dayjs(testCase.dateTo);
      const loopsNumber = Math.ceil(diff / 90);
      let startDate = originalStartDate;
      let endDate = originalStartDate.add(90, "days");

      const oldChunks = [];
      for (let i = 0; i < loopsNumber; i++) {
        if (endDate.isAfter(originalEndDate)) endDate = originalEndDate;

        oldChunks.push({
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        });

        startDate = endDate.add(1, "minutes");
        endDate = startDate.add(90, "days");
      }

      // NEW WAY (native Date-based chunking)
      let currentStartTime = fromDate.getTime();
      const originalEndTime = toDate.getTime();
      const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
      const oneMinuteMs = 60 * 1000;

      const newChunks = [];
      for (let i = 0; i < loopsNumber; i++) {
        let currentEndTime = currentStartTime + ninetyDaysMs;

        if (currentEndTime > originalEndTime) {
          currentEndTime = originalEndTime;
        }

        newChunks.push({
          start: new Date(currentStartTime).toISOString(),
          end: new Date(currentEndTime).toISOString(),
        });

        currentStartTime = currentEndTime + oneMinuteMs;
      }

      // Verify identical chunking results
      expect(newChunks).toHaveLength(oldChunks.length);

      for (let i = 0; i < oldChunks.length; i++) {
        expect(newChunks[i].start).toBe(oldChunks[i].start);
        expect(newChunks[i].end).toBe(oldChunks[i].end);
      }

      log.info(`${testCase.name} - Generated ${newChunks.length} identical chunks`);
    }
  });

  test("date parsing should be consistent between dayjs and native Date for all expected input formats", async () => {
    const dayjs = (await import("@calcom/dayjs")).default;

    // Test various date formats that Google Calendar API might return
    const testDates = [
      "2024-01-01T00:00:00Z", // UTC
      "2024-01-01T12:30:45.123Z", // UTC with milliseconds
      "2024-01-01T00:00:00-08:00", // Timezone offset
      "2024-01-01T00:00:00+05:30", // Positive timezone offset
      "2024-12-31T23:59:59Z", // End of year
      "2024-02-29T12:00:00Z", // Leap year date
    ];

    for (const dateString of testDates) {
      const dayjsTime = dayjs(dateString).valueOf();
      const nativeTime = new Date(dateString).getTime();

      expect(nativeTime).toBe(dayjsTime);

      // Also verify ISO string output consistency
      const dayjsISO = dayjs(dateString).toISOString();
      const nativeISO = new Date(dateString).toISOString();

      expect(nativeISO).toBe(dayjsISO);

      log.debug(`Date parsing verified: ${dateString} -> ${nativeTime}`);
    }
  });

  test("fetchAvailabilityData should handle both single API call and chunked scenarios correctly", async () => {
    const credential = await createCredentialForCalendarService();
    const calendarService = new CalendarService(credential);
    setFullMockOAuthManagerRequest();

    const mockBusyData = [
      { start: "2024-01-01T10:00:00Z", end: "2024-01-01T11:00:00Z" },
      { start: "2024-01-01T14:00:00Z", end: "2024-01-01T15:00:00Z" },
    ];

    // Mock the getCacheOrFetchAvailability method to return consistent data
    const getCacheOrFetchAvailabilitySpy = vi
      .spyOn(calendarService as any, "getCacheOrFetchAvailability")
      .mockResolvedValue(mockBusyData.map((item) => ({ ...item, id: "test@calendar.com" })));

    // Test single API call scenario (≤ 90 days)
    const shortRangeResult = await (calendarService as any).fetchAvailabilityData(
      ["test@calendar.com"],
      "2024-01-01T00:00:00Z",
      "2024-01-31T00:00:00Z", // 30 days
      false
    );

    expect(shortRangeResult).toEqual(mockBusyData);
    expect(getCacheOrFetchAvailabilitySpy).toHaveBeenCalledTimes(1);

    getCacheOrFetchAvailabilitySpy.mockClear();

    // Test chunked scenario (> 90 days)
    const longRangeResult = await (calendarService as any).fetchAvailabilityData(
      ["test@calendar.com"],
      "2024-01-01T00:00:00Z",
      "2024-07-01T00:00:00Z", // 182 days - should require chunking
      false
    );

    // Should return concatenated results from multiple chunks
    expect(longRangeResult.length).toBeGreaterThan(0);
    expect(getCacheOrFetchAvailabilitySpy).toHaveBeenCalledTimes(3); // 182 days / 90 = ~2.02 -> 3 chunks

    getCacheOrFetchAvailabilitySpy.mockRestore();
  });
});

describe("createEvent", () => {
  test("should create event with correct input/output format and handle all expected properties", async () => {
    const credential = await createCredentialForCalendarService();
    const calendarService = new CalendarService(credential);
    setFullMockOAuthManagerRequest();

    // Mock Google Calendar API response
    const mockGoogleEvent = {
      id: "mock-event-id-123",
      summary: "Test Meeting",
      description: "Test meeting description",
      start: {
        dateTime: "2024-06-15T10:00:00Z",
        timeZone: "UTC",
      },
      end: {
        dateTime: "2024-06-15T11:00:00Z",
        timeZone: "UTC",
      },
      attendees: [
        {
          email: "organizer@example.com",
          displayName: "Test Organizer",
          responseStatus: "accepted",
          organizer: true,
        },
        {
          email: "attendee@example.com",
          displayName: "Test Attendee",
          responseStatus: "accepted",
        },
      ],
      location: "Test Location",
      iCalUID: "test-ical-uid@google.com",
      recurrence: null,
    };

    // Mock calendar.events.insert
    const eventsInsertMock = vi.fn().mockResolvedValue({
      data: mockGoogleEvent,
    });

    calendarMock.calendar_v3.Calendar().events.insert = eventsInsertMock;

    // Test input - simplified CalendarServiceEvent
    const testCalEvent = {
      type: "test-event-type",
      uid: "cal-event-uid-123",
      title: "Test Meeting",
      startTime: "2024-06-15T10:00:00Z",
      endTime: "2024-06-15T11:00:00Z",
      organizer: {
        id: 1,
        name: "Test Organizer",
        email: "organizer@example.com",
        timeZone: "UTC",
        language: {
          translate: (...args: any[]) => args[0], // Mock translate function
          locale: "en",
        },
      },
      attendees: [
        {
          id: 2,
          name: "Test Attendee",
          email: "attendee@example.com",
          timeZone: "UTC",
          language: {
            translate: (...args: any[]) => args[0], // Mock translate function
            locale: "en",
          },
        },
      ],
      location: "Test Location",
      calendarDescription: "Test meeting description",
      destinationCalendar: [
        {
          id: 1,
          integration: "google_calendar",
          externalId: "primary",
          primaryEmail: null,
          userId: credential.userId,
          eventTypeId: null,
          credentialId: credential.id,
          delegationCredentialId: null,
          domainWideDelegationCredentialId: null,
          createdAt: new Date("2024-06-15T11:00:00Z"),
          updatedAt: new Date("2024-06-15T11:00:00Z"),
        },
      ],
      iCalUID: "test-ical-uid@google.com",
      conferenceData: undefined,
      hideCalendarEventDetails: false,
      seatsPerTimeSlot: null,
      seatsShowAttendees: true,
    };

    // Call createEvent and verify result using inline snapshot
    const result = await calendarService.createEvent(testCalEvent, credential.id);

    // Verify input processing - check that Google API was called with correct payload
    expect(eventsInsertMock).toHaveBeenCalledTimes(1);
    const insertCall = eventsInsertMock.mock.calls[0][0];

    // Use inline snapshot for input validation
    expect(insertCall).toMatchInlineSnapshot(`
      {
        "calendarId": "primary",
        "conferenceDataVersion": 1,
        "requestBody": {
          "attendees": [
            {
              "displayName": "Test Organizer",
              "email": "primary",
              "id": "1",
              "language": {
                "locale": "en",
                "translate": [Function],
              },
              "name": "Test Organizer",
              "organizer": true,
              "responseStatus": "accepted",
              "timeZone": "UTC",
            },
            {
              "email": "attendee@example.com",
              "language": {
                "locale": "en",
                "translate": [Function],
              },
              "name": "Test Attendee",
              "responseStatus": "accepted",
              "timeZone": "UTC",
            },
          ],
          "description": "Test meeting description",
          "end": {
            "dateTime": "2024-06-15T11:00:00Z",
            "timeZone": "UTC",
          },
          "guestsCanSeeOtherGuests": true,
          "iCalUID": "test-ical-uid@google.com",
          "location": "Test Location",
          "reminders": {
            "useDefault": true,
          },
          "start": {
            "dateTime": "2024-06-15T10:00:00Z",
            "timeZone": "UTC",
          },
          "summary": "Test Meeting",
        },
        "sendUpdates": "none",
      }
    `);

    // Use inline snapshot for output validation
    expect(result).toMatchInlineSnapshot(`
      {
        "additionalInfo": {
          "hangoutLink": "",
        },
        "attendees": [
          {
            "displayName": "Test Organizer",
            "email": "organizer@example.com",
            "organizer": true,
            "responseStatus": "accepted",
          },
          {
            "displayName": "Test Attendee",
            "email": "attendee@example.com",
            "responseStatus": "accepted",
          },
        ],
        "description": "Test meeting description",
        "end": {
          "dateTime": "2024-06-15T11:00:00Z",
          "timeZone": "UTC",
        },
        "iCalUID": "test-ical-uid@google.com",
        "id": "mock-event-id-123",
        "location": "Test Location",
        "password": "",
        "recurrence": null,
        "start": {
          "dateTime": "2024-06-15T10:00:00Z",
          "timeZone": "UTC",
        },
        "summary": "Test Meeting",
        "thirdPartyRecurringEventId": null,
        "type": "google_calendar",
        "uid": "",
        "url": "",
      }
    `);

    log.info("createEvent test passed - input/output formats verified");
  });

  test("should handle recurring events correctly", async () => {
    const credential = await createCredentialForCalendarService();
    const calendarService = new CalendarService(credential);
    setFullMockOAuthManagerRequest();

    // Mock recurring event response
    const mockRecurringEvent = {
      id: "recurring-event-id",
      summary: "Weekly Meeting",
      recurrence: ["RRULE:FREQ=WEEKLY;INTERVAL=1;COUNT=10"],
      start: { dateTime: "2024-06-15T10:00:00Z", timeZone: "UTC" },
      end: { dateTime: "2024-06-15T11:00:00Z", timeZone: "UTC" },
    };

    const mockFirstInstance = {
      id: "recurring-event-id_20240615T100000Z",
      summary: "Weekly Meeting",
      start: { dateTime: "2024-06-15T10:00:00Z", timeZone: "UTC" },
      end: { dateTime: "2024-06-15T11:00:00Z", timeZone: "UTC" },
    };

    calendarMock.calendar_v3.Calendar().events.insert = vi.fn().mockResolvedValue({
      data: mockRecurringEvent,
    });

    calendarMock.calendar_v3.Calendar().events.instances = vi.fn().mockResolvedValue({
      data: { items: [mockFirstInstance] },
    });

    const recurringCalEvent = {
      type: "recurring-meeting",
      title: "Weekly Meeting",
      startTime: "2024-06-15T10:00:00Z",
      endTime: "2024-06-15T11:00:00Z",
      organizer: {
        id: 1,
        name: "Organizer",
        email: "organizer@example.com",
        timeZone: "UTC",
        language: {
          translate: (...args: any[]) => args[0], // Mock translate function
          locale: "en",
        },
      },
      attendees: [],
      recurringEvent: {
        freq: 2, // Weekly
        interval: 1,
        count: 10,
      },
      destinationCalendar: [
        {
          id: 1,
          integration: "google_calendar",
          externalId: "primary",
          primaryEmail: null,
          userId: credential.userId,
          eventTypeId: null,
          credentialId: credential.id,
          delegationCredentialId: null,
          domainWideDelegationCredentialId: null,
          createdAt: new Date("2024-06-15T11:00:00Z"),
          updatedAt: new Date("2024-06-15T11:00:00Z"),
        },
      ],
      calendarDescription: "Weekly team meeting",
    };

    const result = await calendarService.createEvent(recurringCalEvent, credential.id);

    // Use inline snapshot for recurring event result
    expect(result).toMatchInlineSnapshot(`
      {
        "additionalInfo": {
          "hangoutLink": "",
        },
        "end": {
          "dateTime": "2024-06-15T11:00:00Z",
          "timeZone": "UTC",
        },
        "iCalUID": undefined,
        "id": "recurring-event-id_20240615T100000Z",
        "password": "",
        "start": {
          "dateTime": "2024-06-15T10:00:00Z",
          "timeZone": "UTC",
        },
        "summary": "Weekly Meeting",
        "thirdPartyRecurringEventId": "recurring-event-id",
        "type": "google_calendar",
        "uid": "",
        "url": "",
      }
    `);

    // Verify recurrence rule was included in the request
    const insertCall = calendarMock.calendar_v3.Calendar().events.insert.mock.calls[0][0];
    expect(insertCall.requestBody.recurrence).toEqual(["RRULE:FREQ=WEEKLY;INTERVAL=1;COUNT=10"]);

    log.info("createEvent recurring event test passed");
  });
});
