import prismock from "../../../../tests/libs/__mocks__/prisma";
import oAuthManagerMock, { defaultMockOAuthManager } from "../../tests/__mocks__/OAuthManager";
import { adminMock, calendarMock, setCredentialsMock } from "./__mocks__/googleapis";

import { expect, test, beforeEach, vi } from "vitest";
import "vitest-fetch-mock";

import { CalendarCache } from "@calcom/features/calendar-cache/calendar-cache";

import CalendarService from "./CalendarService";

vi.stubEnv("GOOGLE_WEBHOOK_TOKEN", "test-webhook-token");

vi.mock("@calcom/features/flags/server/utils", () => ({
  getFeatureFlag: vi.fn().mockReturnValue(true),
}));

vi.mock("./getGoogleAppKeys", () => ({
  getGoogleAppKeys: vi.fn().mockResolvedValue({
    client_id: "xxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
    client_secret: "xxxxxxxxxxxxxxxxxx",
    redirect_uris: ["http://localhost:3000/api/integrations/googlecalendar/callback"],
  }),
}));

vi.mock("googleapis-common", () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    setCredentials: setCredentialsMock,
  })),
}));
vi.mock("@googleapis/admin", () => adminMock);
vi.mock("@googleapis/calendar", () => calendarMock);

beforeEach(() => {
  vi.clearAllMocks();
  setCredentialsMock.mockClear();
  calendarMock.calendar_v3.Calendar.mockClear();
  adminMock.admin_directory_v1.Admin.mockClear();
});

const googleTestCredentialKey = {
  scope: "https://www.googleapis.com/auth/calendar.events",
  token_type: "Bearer",
  expiry_date: 1625097600000,
  access_token: "",
  refresh_token: "",
};

const getSampleCredential = () => {
  return {
    invalid: false,
    key: googleTestCredentialKey,
    type: "google_calendar",
  };
};

const testSelectedCalendar = {
  userId: 1,
  integration: "google_calendar",
  externalId: "example@cal.com",
};

test("Calendar Cache is being read on cache HIT", async () => {
  const credentialInDb1 = await createCredentialInDb();
  const dateFrom1 = new Date().toISOString();
  const dateTo1 = new Date().toISOString();

  // Create cache
  const calendarCache = await CalendarCache.init(null);
  await calendarCache.upsertCachedAvailability(
    credentialInDb1.id,
    {
      timeMin: dateFrom1,
      timeMax: dateTo1,
      items: [{ id: testSelectedCalendar.externalId }],
    },
    JSON.parse(
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
    )
  );

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
  const credentialInDb = await createCredentialInDb();
  const dateFrom = new Date(Date.now()).toISOString();
  // Tweak date so that it's a cache miss
  const dateTo = new Date(Date.now() + 100000000).toISOString();
  const calendarService = new CalendarService(credentialInDb);

  // Test Cache Miss
  await calendarService.getAvailability(dateFrom, dateTo, [testSelectedCalendar]);

  // Expect cache to be ignored in case of a MISS
  const cachedAvailability = await calendarCache.getCachedAvailability(credentialInDb.id, {
    timeMin: dateFrom,
    timeMax: dateTo,
    items: [{ id: testSelectedCalendar.externalId }],
  });

  expect(cachedAvailability).toBeNull();
});

test("Calendar can be watched and unwatched", async () => {
  const credentialInDb1 = await createCredentialInDb();
  oAuthManagerMock.OAuthManager = defaultMockOAuthManager;
  const calendarCache = await CalendarCache.initFromCredentialId(credentialInDb1.id);
  await calendarCache.watchCalendar({ calendarId: testSelectedCalendar.externalId });
  const watchedCalendar = await prismock.selectedCalendar.findFirst({
    where: {
      userId: credentialInDb1.userId!,
      externalId: testSelectedCalendar.externalId,
      integration: "google_calendar",
    },
  });
  expect(watchedCalendar).toEqual({
    userId: 1,
    integration: "google_calendar",
    externalId: "example@cal.com",
    credentialId: 1,
    domainWideDelegationCredentialId: null,
    googleChannelId: "mock-channel-id",
    googleChannelKind: "api#channel",
    googleChannelResourceId: "mock-resource-id",
    googleChannelResourceUri: "mock-resource-uri",
    googleChannelExpiration: "1111111111",
  });
  await calendarCache.unwatchCalendar({ calendarId: testSelectedCalendar.externalId });
  // There's a bug in prismock where upsert creates duplicate records so we need to acces the second element
  const [, unWatchedCalendar] = await prismock.selectedCalendar.findMany({
    where: {
      userId: credentialInDb1.userId!,
      externalId: testSelectedCalendar.externalId,
      integration: "google_calendar",
    },
  });

  expect(unWatchedCalendar).toEqual({
    userId: 1,
    integration: "google_calendar",
    externalId: "example@cal.com",
    credentialId: 1,
    domainWideDelegationCredentialId: null,
    googleChannelId: null,
    googleChannelKind: null,
    googleChannelResourceId: null,
    googleChannelResourceUri: null,
    googleChannelExpiration: null,
  });
});

test("`updateTokenObject` should update credential in DB as well as myGoogleAuth", async () => {
  const credentialInDb = await createCredentialInDb();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let updateTokenObject: any;
  oAuthManagerMock.OAuthManager = vi.fn().mockImplementation((arg) => {
    updateTokenObject = arg.updateTokenObject;
    return {
      getTokenObjectOrFetch: vi.fn().mockImplementation(() => {
        return {
          token: {
            access_token: "FAKE_ACCESS_TOKEN",
          },
        };
      }),
      request: vi.fn().mockResolvedValue({
        json: [],
      }),
    };
  });

  const calendarService = new CalendarService(credentialInDb);
  await calendarService.listCalendars();

  const newTokenObject = {
    access_token: "NEW_FAKE_ACCESS_TOKEN",
  };

  // Scenario: OAuthManager causes `updateTokenObject` to be called
  await updateTokenObject(newTokenObject);

  const newCredential = await prismock.credential.findFirst({
    where: {
      id: credentialInDb.id,
    },
  });

  // Expect update in DB
  expect(newCredential).toEqual(
    expect.objectContaining({
      key: newTokenObject,
    })
  );

  // Expect update in myGoogleAuth credentials
  expect(setCredentialsMock).toHaveBeenCalledWith(newTokenObject);
});

async function createCredentialInDb() {
  const user = await prismock.user.create({
    data: {
      email: "",
    },
  });

  const app = await prismock.app.create({
    data: {
      slug: "google-calendar",
      dirName: "google-calendar",
    },
  });

  const credential = {
    ...getSampleCredential(),
    key: {
      ...googleTestCredentialKey,
      expiry_date: Date.now() - 1000,
    },
  };

  const credentialInDb = await prismock.credential.create({
    data: {
      ...credential,
      user: {
        connect: {
          id: user.id,
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
  });

  return credentialInDb;
}
