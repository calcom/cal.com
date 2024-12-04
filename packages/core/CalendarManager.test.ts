import { describe, expect, it } from "vitest";

import { getCalendarCredentials } from "./CalendarManager";

describe("CalendarManager tests", () => {
  describe("fn: getCalendarCredentials", () => {
    it("should only return credentials for calendar apps", () => {
      const googleCalendarCredentials = {
        id: "1",
        appId: "google-calendar",
        type: "google_calendar",
        userId: "3",
        key: {
          access_token: "google_calendar_key",
        },
        invalid: false,
      };

      const credentials = [
        googleCalendarCredentials,
        {
          id: "2",
          appId: "office365-video",
          type: "office365_video",
          userId: "4",
          key: {
            access_token: "office365_video_key",
          },
          invalid: false,
        },
      ];

      const calendarCredentials = getCalendarCredentials(credentials);
      expect(calendarCredentials).toHaveLength(1);
      expect(calendarCredentials[0].credential).toBe(googleCalendarCredentials);
    });
  });
});
