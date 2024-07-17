import prismock from "../../../../tests/libs/__mocks__/prisma";
import oAuthManagerMock, { defaultMockOAuthManager } from "../../tests/__mocks__/OAuthManager";
import { googleapisMock, setCredentialsMock } from "./__mocks__/googleapis";

import { expect, test, vi } from "vitest";
import "vitest-fetch-mock";

import CalendarService, { getTimeMax, getTimeMin } from "./CalendarService";

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
googleapisMock.google;

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
    type: "test",
  };
};

const testSelectedCalendar = {
  userId: 1,
  integration: "google_calendar",
  externalId: "example@cal.com",
};

test("Calendar Cache is being read and updated", async () => {
  const credentialInDb1 = await createCredentialInDb();
  const dateFrom1 = new Date().toISOString();
  const dateTo1 = new Date().toISOString();

  // Create cache
  await prismock.calendarCache.create({
    data: {
      credentialId: credentialInDb1.id,
      key: JSON.stringify({
        timeMin: getTimeMin(dateFrom1),
        timeMax: getTimeMax(dateTo1),
        items: [{ id: testSelectedCalendar.externalId }],
      }),
      value: {
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
      },
      expiresAt: String(Date.now() + 10000),
    },
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

  const credentialInDb2 = await createCredentialInDb();
  const dateFrom2 = new Date(Date.now()).toISOString();
  // Tweak date so that it's a cache miss
  const dateTo2 = new Date(Date.now() + 100000000).toISOString();
  const calendarService2 = new CalendarService(credentialInDb2);

  // Test Cache Miss
  await calendarService2.getAvailability(dateFrom2, dateTo2, [testSelectedCalendar]);

  // Expect cache to be updated in case of a MISS
  const calendarCache = await prismock.calendarCache.findFirst({
    where: {
      credentialId: credentialInDb2.id,
      key: JSON.stringify({
        timeMin: getTimeMin(dateFrom2),
        timeMax: getTimeMax(dateTo2),
        items: [{ id: testSelectedCalendar.externalId }],
      }),
    },
  });

  expect(calendarCache?.value).toEqual({ calendars: [] });
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
