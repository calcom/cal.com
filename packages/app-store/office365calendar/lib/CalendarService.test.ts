import prismock from "../../../../tests/libs/__mocks__/prisma";
import oAuthManagerMock from "../../tests/__mocks__/OAuthManager";
import { eventsBatchMockResponse, getEventsBatchMockResponse } from "./__mocks__/office365apis";

import type { Mock } from "vitest";
import { describe, test, expect, beforeEach, vi } from "vitest";

import { CalendarCache } from "@calcom/features/calendar-cache/calendar-cache";
import { getTimeMax, getTimeMin } from "@calcom/features/calendar-cache/lib/datesForCache";
import logger from "@calcom/lib/logger";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
import type { CredentialForCalendarServiceWithTenantId } from "@calcom/types/Credential";

import CalendarService from "./CalendarService";

const log = logger.getSubLogger({ prefix: ["Office365CalendarService.test"] });

const office365calendarTestCredentialKey = {
  scope: "https://graph.microsoft.com/.default",
  token_type: "Bearer",
  expiry_date: 1625097600000,
  access_token: "",
  refresh_token: "",
};

const getSampleCredential = () => {
  return {
    invalid: false,
    key: office365calendarTestCredentialKey,
    type: "office365_calendar",
  };
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
  user = undefined,
  delegatedTo = null,
  delegationCredentialId = null,
}: {
  user?: { email: string | null };
  delegatedTo?: NonNullable<CredentialForCalendarServiceWithTenantId["delegatedTo"]> | null;
  delegationCredentialId?: string | null;
} = {}): Promise<CredentialForCalendarServiceWithTenantId> {
  const defaultUser = await prismock.user.create({
    data: {
      email: user?.email ?? "",
    },
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
      ...office365calendarTestCredentialKey,
      expiry_date: Date.now() - 1000,
    },
  };

  const credentialInDb = !delegatedTo
    ? await prismock.credential.create({
        data: {
          ...credential,
          user: {
            connect: {
              id: defaultUser.id,
            },
          },
          app: {
            connect: {
              slug: app.slug,
            },
          },
        },
        include: {
          user: true,
        },
      })
    : createInMemoryCredential({
        userId: defaultUser.id,
        delegationCredentialId,
        delegatedTo,
      });

  return {
    ...credentialInDb,
    user: user ? { email: user.email ?? "" } : null,
    delegatedTo,
  } as CredentialForCalendarServiceWithTenantId;
}

const testSelectedCalendar = {
  userId: 1,
  integration: "office365_calendar",
  externalId: "example@cal.com",
};

vi.mock("@calcom/features/flags/server/utils", () => ({
  getFeatureFlag: vi.fn().mockReturnValue(true),
}));

let requestRawSpyInstance: Mock;

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes("/token")) {
      return Promise.resolve({
        status: 200,
        headers: new Map([["Content-Type", "application/json"]]),
        clone: vi.fn().mockImplementation(() => ({
          json: async () => ({
            access_token: "mock-access-token",
          }),
        })),
        json: async () => ({
          access_token: "mock-access-token",
        }),
      });
    }

    if (url.includes("/users?")) {
      return Promise.resolve({
        status: 200,
        headers: new Map([["Content-Type", "application/json"]]),
        json: async () => ({
          value: [{ id: "mock-user-id" }],
        }),
      });
    }
  });
  oAuthManagerMock.OAuthManager = vi.fn().mockImplementation(() => {
    const requestRawSpy = vi.fn().mockImplementation(({ url }: { url: string; options?: RequestInit }) => {
      log.debug("Mocked request URL:", url);
      if (url.includes("/$batch")) {
        return Promise.resolve({
          status: 200,
          headers: new Map([["Content-Type", "application/json"]]),
          json: async () => Promise.resolve({ responses: eventsBatchMockResponse }),
        });
      }

      if (url.includes("/subscriptions")) {
        return Promise.resolve({
          status: 200,
          headers: new Map([["Content-Type", "application/json"]]),
          json: async () => ({
            id: "mock-subscription-id",
            expirationDateTime: "11111111111111",
          }),
        });
      }

      return Promise.resolve({
        status: 404,
        headers: new Map([["Content-Type", "application/json"]]),
        json: async () => ({ message: "Not Found" }),
      });
    });

    requestRawSpyInstance = requestRawSpy;
    return {
      requestRaw: requestRawSpy,
    };
  });
});

describe("CalendarCache", () => {
  test("Calendar Cache is being read on cache HIT", async () => {
    const credentialInDb = await createCredentialForCalendarService();
    const dateFrom1 = new Date().toISOString();
    const dateTo1 = new Date().toISOString();

    const calendarCache = await CalendarCache.init(null);
    await calendarCache.upsertCachedAvailability({
      credentialId: credentialInDb.id,
      userId: credentialInDb.userId,
      args: {
        timeMin: getTimeMin(dateFrom1),
        timeMax: getTimeMax(dateTo1),
        items: [{ id: testSelectedCalendar.externalId }],
      },
      value: JSON.parse(JSON.stringify(eventsBatchMockResponse)),
    });

    const calendarService = new CalendarService(credentialInDb);

    // Test cache hit
    const data = await calendarService.getAvailability(dateFrom1, dateTo1, [testSelectedCalendar], true);
    expect(data).toEqual([
      {
        start: "2025-05-02T07:00:00.0000000Z",
        end: "2025-05-02T07:30:00.0000000Z",
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
    await calendarService.getAvailability(dateFrom, dateTo, [testSelectedCalendar], true);

    // Expect cache to be ignored in case of a MISS
    const cachedAvailability = await calendarCache.getCachedAvailability({
      credentialId: credentialInDb.id,
      userId: credentialInDb.userId,
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

    vi.spyOn(calendarService, "fetchAvailability").mockResolvedValue(eventsBatchMockResponse);
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
      eventsBatchMockResponse
    );
  });

  test("A cache set through fetchAvailabilityAndSetCache should be used when doing getAvailability", async () => {
    const credentialInDb = await createCredentialForCalendarService();
    const calendarService = new CalendarService(credentialInDb);
    vi.setSystemTime(new Date("2025-04-01T00:00:00.000Z"));
    const selectedCalendars = [
      {
        externalId: "calendar1@test.com",
        integration: "office365_calendar",
        eventTypeId: null,
        credentialId: credentialInDb.id,
        userId: credentialInDb.userId as number,
      },
    ];

    const calendarCachesBefore = await prismock.calendarCache.findMany();
    expect(calendarCachesBefore).toHaveLength(0);

    const dateFromToCompare = "2025-05-02T07:00:00.0000000";
    const dateToToCompare = "2025-05-02T07:30:00.0000000";

    vi.spyOn(calendarService, "fetchAvailability").mockResolvedValue(
      getEventsBatchMockResponse({
        calendarIds: selectedCalendars.map((calendar) => calendar.externalId),
        startDateTime: dateFromToCompare,
        endDateTime: dateToToCompare,
      })
    );
    await calendarService.fetchAvailabilityAndSetCache(selectedCalendars);
    const calendarCachesAfter = await prismock.calendarCache.findMany();
    console.log({ calendarCachesAfter });
    expect(calendarCachesAfter).toHaveLength(1);
    const dateFrom = "2025-04-01T00:00:00.000Z";
    const dateTo = "2025-06-01T00:00:00.000Z";
    const result = await calendarService.getAvailability(dateFrom, dateTo, selectedCalendars, true);
    expect(result).toEqual([{ start: `${dateFromToCompare}Z`, end: `${dateToToCompare}Z` }]);
  });
});

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
      userId: credentialInDb.userId as number,
      delegationCredentialId,
      delegatedTo,
    }),
    ...credentialInDb,
  };
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
  return await prismock.selectedCalendar.create({
    data: {
      ...data,
    },
  });
}

async function expectSelectedCalendarToNotHaveOutlookSubscriptionProps(id: string) {
  const selectedCalendar = await SelectedCalendarRepository.findById(id);

  expect(selectedCalendar).toEqual(
    expect.objectContaining({
      outlookSubscriptionId: null,
      outlookSubscriptionExpiration: null,
    })
  );
}

describe("Watching and unwatching calendar", () => {
  test("Calendar can be watched and unwatched", async () => {
    const credentialInDb = await createCredentialForCalendarService();
    const calendarService = new CalendarService(credentialInDb);

    await calendarService.watchCalendar({
      calendarId: testSelectedCalendar.externalId,
      eventTypeIds: [null],
    });

    /**
     * Watching a non-existent selectedCalendar creates it,
     * not sure if this is the expected behavior
     */
    const watchedCalendar = await prismock.selectedCalendar.findFirst({
      where: {
        userId: credentialInDb.userId as number,
        externalId: testSelectedCalendar.externalId,
        integration: "office365_calendar",
      },
    });

    expect(watchedCalendar).toEqual(
      expect.objectContaining({
        userId: testSelectedCalendar.userId,
        eventTypeId: null,
        integration: testSelectedCalendar.integration,
        externalId: testSelectedCalendar.externalId,
        credentialId: 1,
        delegationCredentialId: null,
        outlookSubscriptionId: "mock-subscription-id",
        outlookSubscriptionExpiration: "11111111111111",
      })
    );

    expect(watchedCalendar?.id).toBeDefined();

    await calendarService.unwatchCalendar({
      calendarId: testSelectedCalendar.externalId,
      eventTypeIds: [null],
    });
    const calendarAfterUnwatch = await prismock.selectedCalendar.findFirst({
      where: {
        userId: credentialInDb.userId as number,
        externalId: testSelectedCalendar.externalId,
        integration: "office365_calendar",
      },
    });

    expect(calendarAfterUnwatch).toEqual(
      expect.objectContaining({
        userId: 1,
        eventTypeId: null,
        integration: "office365_calendar",
        externalId: "example@cal.com",
        credentialId: 1,
        delegationCredentialId: null,
        outlookSubscriptionId: null,
        outlookSubscriptionExpiration: null,
      })
    );
    expect(calendarAfterUnwatch?.id).toBeDefined();
  });

  test("watchCalendar should not do outlook subscription if already subscribed for the same calendarId", async () => {
    const credentialInDb = await createCredentialForCalendarService();
    const calendarCache = await CalendarCache.initFromCredentialId(credentialInDb.id);
    const userLevelCalendar = await SelectedCalendarRepository.create({
      userId: credentialInDb.userId as number,
      externalId: "externalId@cal.com",
      integration: "office365_calendar",
      eventTypeId: null,
      credentialId: credentialInDb.id,
    });

    const eventTypeLevelCalendar = await SelectedCalendarRepository.create({
      userId: credentialInDb.userId as number,
      externalId: "externalId@cal.com",
      integration: "office365_calendar",
      eventTypeId: 1,
      credentialId: credentialInDb.id,
    });

    await calendarCache.watchCalendar({
      calendarId: userLevelCalendar.externalId,
      eventTypeIds: [userLevelCalendar.eventTypeId],
    });

    /**
     * Should call /subscriptions to create a subscription
     * for the first time
     */
    expect(requestRawSpyInstance).toHaveBeenCalledTimes(1);

    await expectSelectedCalendarToHaveOutlookSubscriptionProps(userLevelCalendar.id, {
      outlookSubscriptionId: "mock-subscription-id",
      outlookSubscriptionExpiration: "11111111111111",
    });

    // Watch different selectedcalendar with same externalId and credentialId
    await calendarCache.watchCalendar({
      calendarId: eventTypeLevelCalendar.externalId,
      eventTypeIds: [eventTypeLevelCalendar.eventTypeId],
    });

    /**
     * Should not call /subscriptions again, as the calendar is already subscribed
     */
    expect(requestRawSpyInstance).toHaveBeenCalledTimes(1);

    await expectSelectedCalendarToHaveOutlookSubscriptionProps(eventTypeLevelCalendar.id, {
      outlookSubscriptionId: "mock-subscription-id",
      outlookSubscriptionExpiration: "11111111111111",
    });
  });

  test("watchCalendar should do outlook subscription if already subscribed but for different calendarId", async () => {
    const credentialInDb = await createCredentialForCalendarService();
    const calendarCache = await CalendarCache.initFromCredentialId(credentialInDb.id);
    const userLevelCalendar = await SelectedCalendarRepository.create({
      userId: credentialInDb.userId as number,
      externalId: "externalId@cal.com",
      integration: "office365_calendar",
      eventTypeId: null,
      credentialId: credentialInDb.id,
    });

    const eventTypeLevelCalendar = await SelectedCalendarRepository.create({
      userId: credentialInDb.userId as number,
      externalId: "externalId2@cal.com",
      integration: "office365_calendar",
      eventTypeId: 1,
      credentialId: credentialInDb.id,
    });

    await calendarCache.watchCalendar({
      calendarId: userLevelCalendar.externalId,
      eventTypeIds: [userLevelCalendar.eventTypeId],
    });

    /**
     * Should call /subscriptions to create a subscription
     * for the first time
     */
    expect(requestRawSpyInstance).toHaveBeenCalledTimes(1);

    await expectSelectedCalendarToHaveOutlookSubscriptionProps(userLevelCalendar.id, {
      outlookSubscriptionId: "mock-subscription-id",
      outlookSubscriptionExpiration: "11111111111111",
    });

    // Watch different selectedcalendar with same externalId and credentialId
    await calendarCache.watchCalendar({
      calendarId: eventTypeLevelCalendar.externalId,
      eventTypeIds: [eventTypeLevelCalendar.eventTypeId],
    });

    /**
     * Should call /subscriptions again, as the calendar is different
     */
    expect(requestRawSpyInstance).toHaveBeenCalledTimes(2);

    await expectSelectedCalendarToHaveOutlookSubscriptionProps(eventTypeLevelCalendar.id, {
      outlookSubscriptionId: "mock-subscription-id",
      outlookSubscriptionExpiration: "11111111111111",
    });
  });

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

  test("unwatchCalendar should not unsubscribe from outlook if there is another selectedCalendar with same externalId and credentialId", async () => {
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

    const commonProps = {
      userId: credentialInDb1.userId as number,
      externalId: "externalId@cal.com",
      integration: "office365_calendar",
      credentialId: credentialInDb1.id,
    };

    const userLevelCalendar = await SelectedCalendarRepository.create({
      ...commonProps,
      outlookSubscriptionId: "user-level-id",
      outlookSubscriptionExpiration: "11111111111111",
      eventTypeId: null,
    });

    const eventTypeLevelCalendar = await SelectedCalendarRepository.create({
      ...commonProps,
      outlookSubscriptionId: "event-type-level-id",
      outlookSubscriptionExpiration: "11111111111111",
      eventTypeId: 1,
    });

    const eventTypeLevelCalendarForSomeOtherExternalIdButSameCredentialId =
      await SelectedCalendarRepository.create({
        ...commonProps,
        outlookSubscriptionId: "other-external-id-but-same-credential-id",
        outlookSubscriptionExpiration: "11111111111111",
        externalId: "externalId2@cal.com",
        eventTypeId: 2,
      });

    await calendarCache.unwatchCalendar({
      calendarId: userLevelCalendar.externalId,
      eventTypeIds: [userLevelCalendar.eventTypeId],
    });

    // There is another selectedCalendar with same externalId and credentialId, so actual unsubscription does not happen
    expect(requestRawSpyInstance).toHaveBeenCalledTimes(0);
    await expectSelectedCalendarToNotHaveOutlookSubscriptionProps(userLevelCalendar.id);

    await calendarCache.unwatchCalendar({
      calendarId: eventTypeLevelCalendar.externalId,
      eventTypeIds: [eventTypeLevelCalendar.eventTypeId],
    });

    /**
     * Will be called twice, because we are unsubscribing from
     * all calendar with same externalId
     */
    expect(requestRawSpyInstance).toHaveBeenCalledTimes(2);

    // Concerned cache will just have remaining externalIds
    await expectCacheToBeSet({
      credentialId: credentialInDb1.id,
      itemsInKey: [{ id: eventTypeLevelCalendarForSomeOtherExternalIdButSameCredentialId.externalId }],
    });

    await expectCacheToBeSet({
      credentialId: someOtherCache.credentialId,
      itemsInKey: JSON.parse(someOtherCache.key).items,
    });

    await expectSelectedCalendarToNotHaveOutlookSubscriptionProps(eventTypeLevelCalendar.id);

    // Some other selectedCalendar stays unaffected
    await expectSelectedCalendarToHaveOutlookSubscriptionProps(
      eventTypeLevelCalendarForSomeOtherExternalIdButSameCredentialId.id,
      {
        outlookSubscriptionId: "other-external-id-but-same-credential-id",
        outlookSubscriptionExpiration: "11111111111111",
      }
    );
  });

  describe("Delegation Credential", () => {
    test("On watching a SelectedCalendar having delegationCredential, it should set outlookSubscriptionId and other props", async () => {
      const delegationCredential1Member = await createDelegationCredentialForCalendarService({
        user: { email: "user1@example.com" },
        delegationCredentialId: "delegation-credential-id-1",
      });

      await prismock.selectedCalendar.create({
        data: {
          userId: delegationCredential1Member.userId as number,
          externalId: testSelectedCalendar.externalId,
          integration: "office365_calendar",
        },
      });

      const calendarService = new CalendarService(delegationCredential1Member);
      await calendarService.watchCalendar({
        calendarId: testSelectedCalendar.externalId,
        eventTypeIds: [null],
      });

      const calendars = await prismock.selectedCalendar.findMany();
      // Ensure no new calendar is created
      expect(calendars).toHaveLength(1);
      const watchedCalendar = calendars[0];

      await expectSelectedCalendarToHaveOutlookSubscriptionProps(watchedCalendar.id, {
        outlookSubscriptionId: "mock-subscription-id",
        outlookSubscriptionExpiration: "11111111111111",
      });
    });

    test("On unwatching a SelectedCalendar connected to Delegation Credential, it should remove outlookSubscriptionId and other props", async () => {
      const delegationCredential1Member1 = await createDelegationCredentialForCalendarCache({
        user: { email: "user1@example.com" },
        delegationCredentialId: "delegation-credential-id-1",
      });

      const selectedCalendar = await createSelectedCalendarForDelegationCredential({
        userId: delegationCredential1Member1.userId as number,
        delegationCredentialId: delegationCredential1Member1.delegatedToId as string,
        credentialId: delegationCredential1Member1.id,
        externalId: testSelectedCalendar.externalId,
        integration: "office365_calendar",
        outlookSubscriptionId: "mock-subscription-id",
        outlookSubscriptionExpiration: "1111111111",
      });

      const calendarService = new CalendarService(delegationCredential1Member1);
      await calendarService.unwatchCalendar({
        calendarId: selectedCalendar.externalId,
        eventTypeIds: [null],
      });

      const calendars = await prismock.selectedCalendar.findMany();
      expect(calendars).toHaveLength(1);
      const calendarAfterUnwatch = calendars[0];

      expectSelectedCalendarToNotHaveOutlookSubscriptionProps(calendarAfterUnwatch.id);
    });
  });
});
