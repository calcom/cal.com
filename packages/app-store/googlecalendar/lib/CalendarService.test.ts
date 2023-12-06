import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";

import { afterEach, expect, test, vi } from "vitest";

import CalendarService from "./CalendarService";

afterEach(() => {
  vi.resetAllMocks();
});

vi.mock("@calcom/features/flags/server/utils", () => ({
  getFeatureFlagMap: vi.fn().mockResolvedValue({
    "calendar-cache": true,
  }),
}));

vi.mock("./getGoogleAppKeys", () => ({
  getGoogleAppKeys: vi.fn().mockResolvedValue({
    client_id: "xxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
    client_secret: "xxxxxxxxxxxxxxxxxx",
    redirect_uris: ["http://localhost:3000/api/integrations/googlecalendar/callback"],
  }),
}));

const googleTestCredential = {
  scope: "https://www.googleapis.com/auth/calendar.events",
  token_type: "Bearer",
  expiry_date: 1625097600000,
  access_token: "",
  refresh_token: "",
};

const testCredential = {
  appId: "test",
  id: 1,
  invalid: false,
  key: googleTestCredential,
  type: "test",
  userId: 1,
  user: { email: "example@cal.com" },
  teamId: 1,
};

const testSelectedCalendar = {
  userId: 1,
  integration: "google_calendar",
  externalId: "example@cal.com",
};

const testFreeBusyResponse = {
  kind: "calendar#freeBusy",
  timeMax: "2024-01-01T20:59:59.000Z",
  timeMin: "2023-11-30T20:00:00.000Z",
  calendars: {
    "example@cal.com": {
      busy: [
        { end: "2023-12-01T19:00:00Z", start: "2023-12-01T18:00:00Z" },
        { end: "2023-12-04T19:00:00Z", start: "2023-12-04T18:00:00Z" },
      ],
    },
    "xxxxxxxxxxxxxxxxxxxxxxxxxx@group.calendar.google.com": { busy: [] },
  },
};

const calendarCacheResponse = {
  key: "dummy",
  expiresAt: new Date(),
  credentialId: 1,
  value: testFreeBusyResponse,
};

test("Calendar Cache is being called", async () => {
  prismaMock.calendarCache.findUnique
    // First call won't have a cache
    .mockResolvedValueOnce(null)
    // Second call will have a cache
    .mockResolvedValueOnce(calendarCacheResponse);

  // prismaMock.calendarCache.create.mock.
  const calendarService = new CalendarService(testCredential);
  vi.spyOn(calendarService, "authedCalendar").mockReturnValue({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore - Mocking the authedCalendar so can't return the actual response
    freebusy: {
      query: vi.fn().mockReturnValue({
        data: testFreeBusyResponse,
      }),
    },
  });

  await calendarService.getAvailability(new Date().toISOString(), new Date().toISOString(), [
    testSelectedCalendar,
  ]);
  await calendarService.getAvailability(new Date().toISOString(), new Date().toISOString(), [
    testSelectedCalendar,
  ]);
  expect(prismaMock.calendarCache.findUnique).toHaveBeenCalled();
  expect(prismaMock.calendarCache.upsert).toHaveBeenCalledOnce();
});
