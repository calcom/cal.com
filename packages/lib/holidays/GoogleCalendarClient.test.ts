import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("./constants", () => ({
  GOOGLE_HOLIDAY_CALENDARS: {
    US: { name: "United States", calendarId: "en.usa#holiday@group.v.calendar.google.com" },
  },
}));

vi.mock("@calcom/dayjs", () => {
  const mockDayjs = (date: string) => ({
    startOf: () => ({ toISOString: () => `${date}T00:00:00.000Z` }),
    endOf: () => ({ toISOString: () => `${date}T23:59:59.999Z` }),
    toDate: () => new Date(date),
  });
  return { default: mockDayjs };
});

import { GoogleCalendarClient, getGoogleCalendarClient } from "./GoogleCalendarClient";

describe("GoogleCalendarClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("GOOGLE_CALENDAR_API_KEY", "test-api-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("constructor", () => {
    it("uses provided API key", () => {
      const client = new GoogleCalendarClient("custom-key");
      expect(client).toBeDefined();
    });

    it("falls back to GOOGLE_CALENDAR_API_KEY env var", () => {
      const client = new GoogleCalendarClient();
      expect(client).toBeDefined();
    });

    it("throws when no API key available", () => {
      vi.stubEnv("GOOGLE_CALENDAR_API_KEY", "");

      expect(() => new GoogleCalendarClient()).toThrow(
        "GOOGLE_CALENDAR_API_KEY environment variable is not set"
      );
    });
  });

  describe("fetchHolidays", () => {
    it("returns empty array for unknown country code", async () => {
      const client = new GoogleCalendarClient("test-key");
      const result = await client.fetchHolidays("XX", 2026);

      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("fetches events from Google Calendar API", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            items: [
              {
                id: "event1",
                summary: "New Year's Day",
                start: { date: "2026-01-01" },
                end: { date: "2026-01-02" },
              },
            ],
          }),
      });

      const client = new GoogleCalendarClient("test-key");
      const result = await client.fetchHolidays("US", 2026);

      expect(mockFetch).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("New Year's Day");
      expect(result[0].id).toBe("US_event1");
      expect(result[0].countryCode).toBe("US");
    });

    it("handles events with dateTime", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            items: [
              {
                id: "event2",
                summary: "Holiday",
                start: { dateTime: "2026-07-04T00:00:00Z" },
                end: { dateTime: "2026-07-05T00:00:00Z" },
              },
            ],
          }),
      });

      const client = new GoogleCalendarClient("test-key");
      const result = await client.fetchHolidays("US", 2026);

      expect(result).toHaveLength(1);
      expect(result[0].eventId).toBe("event2");
    });

    it("returns empty array when no items in response", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({}),
      });

      const client = new GoogleCalendarClient("test-key");
      const result = await client.fetchHolidays("US", 2026);

      expect(result).toEqual([]);
    });

    it("throws on API error response", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            error: { code: 403, message: "Forbidden" },
          }),
      });

      const client = new GoogleCalendarClient("test-key");

      await expect(client.fetchHolidays("US", 2026)).rejects.toThrow("Google Calendar API error");
    });
  });
});

describe("getGoogleCalendarClient", () => {
  it("returns a GoogleCalendarClient instance", () => {
    vi.stubEnv("GOOGLE_CALENDAR_API_KEY", "test-key");
    const client = getGoogleCalendarClient();
    expect(client).toBeInstanceOf(GoogleCalendarClient);
  });
});
