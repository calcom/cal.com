import prismock from "../../../../tests/libs/__mocks__/prisma";
import oAuthManagerMock from "../../tests/__mocks__/OAuthManager";
import { eventsBatchMockResponse } from "./__mocks__/office365apis";

import { describe, test, expect, beforeEach, vi } from "vitest";

import { CalendarCache } from "@calcom/features/calendar-cache/calendar-cache";
import { getTimeMax, getTimeMin } from "@calcom/features/calendar-cache/lib/datesForCache";
import logger from "@calcom/lib/logger";
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

function handleEventsRequest() {
  return {
    status: 200,
    headers: new Map([["Content-Type", "application/json"]]),
    json: async () => ({
      value: [
        {
          id: "calendar-id-1",
          name: "Test Calendar",
          isDefaultCalendar: true,
          canEdit: true,
        },
      ],
    }),
  };
}

vi.mock("@calcom/features/flags/server/utils", () => ({
  getFeatureFlag: vi.fn().mockReturnValue(true),
}));

beforeEach(() => {
  vi.clearAllMocks();
  oAuthManagerMock.OAuthManager = vi.fn().mockImplementation(() => ({
    requestRaw: vi.fn().mockImplementation(({ url }: { url: string; options?: RequestInit }) => {
      log.debug("Mocked request URL:", url);
      if (url.includes("/calendar/events")) {
        return Promise.resolve(handleEventsRequest());
      }

      return Promise.resolve({
        status: 404,
        headers: new Map([["Content-Type", "application/json"]]),
        json: async () => ({ message: "Not Found" }),
      });
    }),
  }));
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
});
