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
