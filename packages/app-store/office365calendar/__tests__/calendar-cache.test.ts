import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import dayjs from "@calcom/dayjs";
import { CalendarCache } from "@calcom/features/calendar-cache";
import logger from "@calcom/lib/logger";
import { mockCalendarCache } from "@calcom/lib/test/fixtures";
import type { BufferedBusyTime } from "@calcom/types/BufferedBusyTime";

import Office365CalendarService from "../lib/CalendarService";

const log = logger.getSubLogger({ prefix: ["office365calendar:test"] });

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

// Mock the CalendarCache
vi.mock("@calcom/features/calendar-cache", () => ({
  CalendarCache: {
    init: vi.fn().mockResolvedValue({
      getCachedAvailability: vi.fn(),
      upsertCachedAvailability: vi.fn(),
      watchCalendar: vi.fn(),
      unwatchCalendar: vi.fn(),
    }),
  },
}));

describe("Office365CalendarService", () => {
  const credentials = {
    id: 123,
    userId: 456,
    type: "office365_calendar",
    key: {
      accessToken: "access-token",
      refresh_token: "refresh-token",
      expiry_date: Date.now() + 3600000,
    },
    appId: "office365calendar",
  };

  // Calendar service related mocks
  let calendarServiceMock: {
    getAvailability: ReturnType<typeof vi.fn>;
    apiGraphBatchCall: ReturnType<typeof vi.fn>;
    auth: { requestRaw: ReturnType<typeof vi.fn> };
    log: { error: ReturnType<typeof vi.fn> };
    getUserEndpoint: ReturnType<typeof vi.fn>;
    credential: typeof credentials;
  };

  const mockBusyTimes: BufferedBusyTime[] = [
    {
      start: "2023-01-01T09:00:00Z",
      end: "2023-01-01T10:00:00Z",
    },
    {
      start: "2023-01-01T12:00:00Z",
      end: "2023-01-01T13:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    calendarServiceMock = {
      getAvailability: vi.fn().mockResolvedValue(mockBusyTimes),
      apiGraphBatchCall: vi.fn().mockImplementation(() =>
        Promise.resolve({
          headers: new Headers(),
          ok: true,
          status: 200,
          json: () => Promise.resolve({ responses: [] }),
        })
      ),
      auth: {
        requestRaw: vi.fn().mockResolvedValue({
          headers: new Headers({ "content-encoding": "" }),
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        }),
      },
      log: {
        error: vi.fn(),
      },
      getUserEndpoint: vi.fn().mockResolvedValue("/me"),
      credential: { ...credentials },
    };

    // Reset all mocks
    vi.spyOn(CalendarCache, "init").mockReset();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("calendar caching", () => {
    it("should try to get cached availability first", async () => {
      // Arrange
      const service = new Office365CalendarService(credentials as any);

      // Mock the calendar cache to return null (cache miss)
      const mockCacheInstance = {
        getCachedAvailability: vi.fn().mockResolvedValue(null),
        upsertCachedAvailability: vi.fn(),
        watchCalendar: vi.fn(),
        unwatchCalendar: vi.fn(),
      };
      vi.mocked(CalendarCache.init).mockResolvedValue(mockCacheInstance as any);

      // Mock the actual API call
      vi.spyOn(service as any, "apiGraphBatchCall").mockImplementation(() =>
        Promise.resolve({
          headers: new Headers(),
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              responses: [
                {
                  id: "1",
                  status: 200,
                  headers: {},
                  body: {
                    value: [
                      {
                        showAs: "busy",
                        start: { dateTime: "2023-01-01T09:00:00" },
                        end: { dateTime: "2023-01-01T10:00:00" },
                      },
                    ],
                  },
                },
              ],
            }),
        })
      );

      vi.spyOn(service as any, "getCachedAvailability").mockImplementation(() => Promise.resolve(null));
      vi.spyOn(service as any, "setAvailabilityInCache").mockImplementation(() => Promise.resolve());
      vi.spyOn(service as any, "fetchResponsesWithNextLink").mockImplementation((responses) =>
        Promise.resolve(responses)
      );
      vi.spyOn(service as any, "processBusyTimes").mockImplementation(() => [
        {
          start: "2023-01-01T09:00:00Z",
          end: "2023-01-01T10:00:00Z",
        },
      ]);

      // Act
      const dateFrom = dayjs().subtract(1, "day").toISOString();
      const dateTo = dayjs().add(1, "day").toISOString();
      const selectedCalendars = [
        {
          integration: "office365_calendar",
          externalId: "calendar-id-1",
          credentialId: 123,
        },
      ];
      const result = await service.getAvailability(dateFrom, dateTo, selectedCalendars);

      // Assert
      expect(CalendarCache.init).toHaveBeenCalledTimes(1);
      expect(mockCacheInstance.getCachedAvailability).toHaveBeenCalledTimes(0); // Directly mocked by getCachedAvailability
      expect(service["apiGraphBatchCall"]).toHaveBeenCalled();
      expect(service["setAvailabilityInCache"]).toHaveBeenCalled();
      expect(result).toEqual([
        {
          start: "2023-01-01T09:00:00Z",
          end: "2023-01-01T10:00:00Z",
        },
      ]);
    });

    it("should return cached availability when available", async () => {
      // Arrange
      const service = new Office365CalendarService(credentials as any);

      // Mock cached data
      const cachedBusyTimes = [
        {
          start: "2023-01-01T11:00:00Z",
          end: "2023-01-01T12:00:00Z",
        },
      ];

      vi.spyOn(service as any, "getCachedAvailability").mockImplementation(() =>
        Promise.resolve(cachedBusyTimes)
      );

      // Act
      const dateFrom = dayjs().subtract(1, "day").toISOString();
      const dateTo = dayjs().add(1, "day").toISOString();
      const selectedCalendars = [
        {
          integration: "office365_calendar",
          externalId: "calendar-id-1",
          credentialId: 123,
        },
      ];
      const result = await service.getAvailability(dateFrom, dateTo, selectedCalendars);

      // Assert
      expect(service["apiGraphBatchCall"]).not.toHaveBeenCalled(); // API shouldn't be called
      expect(service["getCachedAvailability"]).toHaveBeenCalledTimes(1);
      expect(result).toEqual(cachedBusyTimes);
    });

    it("should update cache when fetching new availability data", async () => {
      // Arrange
      const service = new Office365CalendarService(credentials as any);

      vi.spyOn(service as any, "getCachedAvailability").mockImplementation(() => Promise.resolve(null));
      vi.spyOn(service as any, "setAvailabilityInCache").mockImplementation(() => Promise.resolve());
      vi.spyOn(service as any, "apiGraphBatchCall").mockImplementation(() =>
        Promise.resolve({
          headers: new Headers(),
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              responses: [
                {
                  id: "1",
                  status: 200,
                  headers: {},
                  body: {
                    value: [
                      {
                        showAs: "busy",
                        start: { dateTime: "2023-01-01T09:00:00" },
                        end: { dateTime: "2023-01-01T10:00:00" },
                      },
                    ],
                  },
                },
              ],
            }),
        })
      );
      vi.spyOn(service as any, "fetchResponsesWithNextLink").mockImplementation((responses) =>
        Promise.resolve(responses)
      );
      vi.spyOn(service as any, "processBusyTimes").mockImplementation(() => [
        {
          start: "2023-01-01T09:00:00Z",
          end: "2023-01-01T10:00:00Z",
        },
      ]);

      // Act
      const dateFrom = dayjs().subtract(1, "day").toISOString();
      const dateTo = dayjs().add(1, "day").toISOString();
      const selectedCalendars = [
        {
          integration: "office365_calendar",
          externalId: "calendar-id-1",
          credentialId: 123,
        },
      ];
      await service.getAvailability(dateFrom, dateTo, selectedCalendars);

      // Assert
      expect(service["getCachedAvailability"]).toHaveBeenCalledTimes(1);
      expect(service["setAvailabilityInCache"]).toHaveBeenCalledTimes(1);
      expect(service["apiGraphBatchCall"]).toHaveBeenCalledTimes(1);
    });
  });
});