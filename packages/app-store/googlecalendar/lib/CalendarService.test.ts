import { afterEach, test, vi } from "vitest";
import prismaMock from "../../../../tests/libs/__mocks__/prisma";

import CalendarService from "./CalendarService";

afterEach(() => {
  vi.resetAllMocks();
});

const googleTestCredential = {
  scope: 'https://www.googleapis.com/auth/calendar.events',
  token_type: "Bearer",
  expiry_date: 1625097600000,
  access_token: '',
  refresh_token: '',
};

const testCredential = {
  appId: 'test',
  id: 1,
  invalid: false,
  key: googleTestCredential,
  type: 'test',
  userId: 1,
  teamId: 1
};


vi.mock("./getGoogleAppKeys", () => ({
  getGoogleAppKeys: vi.fn().mockResolvedValue({
    client_id: "xxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
    client_secret: "xxxxxxxxxxxxxxxxxx",
    redirect_uris: ["http://localhost:3000/api/integrations/googlecalendar/callback"]
  })
}));

test("Calendar Cache is being called", async () => {
  prismaMock.calendarCache.findUnique.mockResolvedValue(null);
  const calendarService = new CalendarService(testCredential);
  
   const availability = calendarService.getAvailability(
    new Date().toISOString(),
    new Date().toISOString(),
    [{
      userId: 4,
      integration: 'google_calendar',
      externalId: 'example@cal.com'
    }]
  )
  console.log('availability', availability)
  expect(prismaMock.calendarCache.findUnique).toHaveBeenCalled();
});
