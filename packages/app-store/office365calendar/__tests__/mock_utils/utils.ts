import prismock from "../../../../../tests/libs/__mocks__/prisma";

import { expect } from "vitest";

import { getTimeMax, getTimeMin } from "@calcom/features/calendar-cache/lib/datesForCache";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
import type { CredentialForCalendarServiceWithTenantId } from "@calcom/types/Credential";

import { TEST_DATES, cacheTestDates } from "../dates";

/**
 * Test utilities for Office365 Calendar optimization testing
 * Based on analyzed patterns with focus on resolved calendar checking issue
 */

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

export const testSelectedCalendar = {
  userId: 123,
  integration: "office365_calendar",
  externalId: "cal1",
};

/**
 * Create in-memory credential for delegation testing
 */
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

/**
 * Create credential for calendar service testing
 * Optimized for multiple calendar scenarios
 */
export async function createCredentialForCalendarService({
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

/**
 * Create multiple credentials for team optimization testing
 */
export async function createMultipleCredentialsForTeam(memberCount = 3) {
  const credentials = [];
  for (let i = 1; i <= memberCount; i++) {
    const credential = await createCredentialForCalendarService({
      user: { email: `member${i}@example.com` },
    });
    credentials.push(credential);
  }
  return credentials;
}

/**
 * Create selected calendar for delegation credential
 */
export async function createSelectedCalendarForDelegationCredential(data: {
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

/**
 * Create selected calendar for regular credential
 */
export async function createSelectedCalendarForRegularCredential(data: {
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

/**
 * Create multiple selected calendars for optimization testing
 */
export async function createMultipleSelectedCalendars(
  userId: number,
  credentialId: number,
  calendarCount = 3
) {
  const calendars = [];
  for (let i = 1; i <= calendarCount; i++) {
    const calendar = await prismock.selectedCalendar.create({
      data: {
        userId,
        credentialId,
        externalId: `calendar-${i}`,
        integration: "office365_calendar",
        outlookSubscriptionId: null,
        outlookSubscriptionExpiration: null,
      },
    });
    calendars.push(calendar);
  }
  return calendars;
}

export const defaultDelegatedCredential = {
  serviceAccountKey: {
    client_id: "service-client-id",
    private_key: "service-private-key",
    tenant_id: "service-tenant-id",
  },
} as const;

/**
 * Create delegation credential for calendar service
 */
export async function createDelegationCredentialForCalendarService({
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

/**
 * Create delegation credential for calendar cache testing
 */
export async function createDelegationCredentialForCalendarCache({
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

/**
 * Cache testing utilities
 */
export async function expectCacheToBeNotSet({ credentialId }: { credentialId: number }) {
  const caches = await prismock.calendarCache.findMany({
    where: { credentialId },
  });
  expect(caches).toHaveLength(0);
}

export async function expectCacheToBeSet({
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

/**
 * Calendar cache helpers for optimization testing
 */
export const calendarCacheHelpers = {
  FUTURE_EXPIRATION_DATE: new Date(Date.now() + 100000000),

  getDatePair: () => {
    const dateFrom = TEST_DATES.AVAILABILITY_START;
    const dateTo = TEST_DATES.AVAILABILITY_END;
    return {
      dateFrom,
      dateTo,
      minDateFrom: getTimeMin(dateFrom),
      maxDateTo: getTimeMax(dateTo),
    };
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

  /**
   * Create cache for multiple calendars (optimization scenario)
   */
  setCacheForMultipleCalendars: async ({
    credentialId,
    calendarIds,
    userId,
    busyTimes = [],
  }: {
    credentialId: number;
    calendarIds: string[];
    userId: number;
    busyTimes?: any[];
  }) => {
    const cacheKey = cacheTestDates.getCacheKeyForCalendars(calendarIds);
    const cacheValue = JSON.stringify(busyTimes);

    await calendarCacheHelpers.setCache({
      credentialId,
      key: cacheKey,
      value: cacheValue,
      userId,
      expiresAt: calendarCacheHelpers.FUTURE_EXPIRATION_DATE,
    });
  },
};

/**
 * Subscription testing utilities
 */
export async function expectSelectedCalendarToHaveOutlookSubscriptionProps(
  id: string,
  outlookSubscriptionProps: {
    outlookSubscriptionId: string;
    outlookSubscriptionExpiration: string;
  }
) {
  const selectedCalendar = await SelectedCalendarRepository.findById(id);
  expect(selectedCalendar).toEqual(expect.objectContaining(outlookSubscriptionProps));
}

export async function expectSelectedCalendarToNotHaveOutlookSubscriptionProps(selectedCalendarId: string) {
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

/**
 * Webhook subscription testing utilities
 */
export function expectOutlookSubscriptionToHaveOccurredAndClearMock(fetcherSpy: any) {
  expect(fetcherSpy).toHaveBeenCalledWith(
    "/subscriptions",
    expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"changeType":"created,updated,deleted"'),
    })
  );
  fetcherSpy.mockClear();
}

export function expectOutlookSubscriptionToNotHaveOccurredAndClearMock(fetcherSpy: any) {
  expect(fetcherSpy).not.toHaveBeenCalledWith("/subscriptions");
  fetcherSpy.mockClear();
}

export function expectOutlookUnsubscriptionToHaveOccurredAndClearMock(
  fetcherSpy: any,
  subscriptionIds: string[]
) {
  subscriptionIds.forEach((id) => {
    expect(fetcherSpy).toHaveBeenCalledWith(`/subscriptions/${id}`, { method: "DELETE" });
  });
  fetcherSpy.mockClear();
}

export function expectOutlookUnsubscriptionToNotHaveOccurredAndClearMock(fetcherSpy: any) {
  expect(fetcherSpy).not.toHaveBeenCalledWith(
    expect.stringContaining("/subscriptions"),
    expect.objectContaining({ method: "DELETE" })
  );
  fetcherSpy.mockClear();
}

/**
 * Team event testing utilities for round-robin optimization
 */
export const teamEventHelpers = {
  /**
   * Create team with multiple members and calendars
   */
  createTeamWithMembers: async (memberCount = 3, calendarsPerMember = 2) => {
    const team = await prismock.team.create({
      data: {
        name: "Test Team",
        slug: "test-team",
      },
    });

    const members = [];
    for (let i = 1; i <= memberCount; i++) {
      const user = await prismock.user.create({
        data: {
          email: `member${i}@example.com`,
          name: `Member ${i}`,
        },
      });

      await prismock.membership.create({
        data: {
          userId: user.id,
          teamId: team.id,
          role: "MEMBER",
          accepted: true,
        },
      });

      // Create multiple calendars per member
      const memberCalendars = [];
      for (let j = 1; j <= calendarsPerMember; j++) {
        const credential = await createCredentialForCalendarService({
          user: { email: user.email },
        });

        const calendar = await prismock.selectedCalendar.create({
          data: {
            userId: user.id,
            credentialId: credential.id,
            externalId: `member${i}-calendar${j}`,
            integration: "office365_calendar",
          },
        });

        memberCalendars.push({ calendar, credential });
      }

      members.push({ user, calendars: memberCalendars });
    }

    return { team, members };
  },

  /**
   * Verify optimization: batch API calls vs individual calls
   */
  expectBatchApiCallsUsed: (fetcherSpy: any, expectedBatchCount = 1) => {
    const batchCalls = fetcherSpy.mock.calls.filter((call: any) => call[0].includes("/$batch"));
    expect(batchCalls).toHaveLength(expectedBatchCount);
  },

  /**
   * Verify optimization: individual API calls are minimized
   */
  expectIndividualApiCallsMinimized: (fetcherSpy: any, maxIndividualCalls = 2) => {
    const individualCalls = fetcherSpy.mock.calls.filter(
      (call: any) =>
        !call[0].includes("/$batch") && (call[0].includes("/calendars/") || call[0].includes("/events"))
    );
    expect(individualCalls.length).toBeLessThanOrEqual(maxIndividualCalls);
  },
};

/**
 * Performance testing utilities for optimization validation
 */
export const performanceHelpers = {
  /**
   * Measure API call count for optimization testing
   */
  measureApiCalls: (
    fetcherSpy: any
  ): { total: number; batch: number; individual: number; subscriptions: number } => {
    return {
      total: fetcherSpy.mock.calls.length,
      batch: fetcherSpy.mock.calls.filter((call: any) => call[0].includes("/$batch")).length,
      individual: fetcherSpy.mock.calls.filter(
        (call: any) => !call[0].includes("/$batch") && call[0].includes("/me/")
      ).length,
      subscriptions: fetcherSpy.mock.calls.filter((call: any) => call[0].includes("/subscriptions")).length,
    };
  },

  /**
   * Validate optimization metrics
   */
  validateOptimization: (
    apiCalls: { total: number; batch: number; individual: number; subscriptions: number },
    calendarCount: number
  ): void => {
    // After optimization: should use batch calls instead of individual calls per calendar
    expect(apiCalls.batch).toBeGreaterThan(0);
    expect(apiCalls.individual).toBeLessThan(calendarCount); // Should be significantly less than calendar count
  },
};
