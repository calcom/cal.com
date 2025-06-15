import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";
import "vitest-fetch-mock";

import logger from "@calcom/lib/logger";

import { getTokenObjectFromCredential } from "../../../_utils/oauth/getTokenObjectFromCredential";
import Office365CalendarService from "../../lib/CalendarService";
import { Office365CalendarCache } from "../../lib/Office365CalendarCache";
import { getOfficeAppKeys } from "../../lib/getOfficeAppKeys";
import { TEST_DATES, generateMockData } from "../dates";
import { defaultFetcherMockImplementation } from "../mock_utils/mocks";
import {
  calendarCacheHelpers,
  createCredentialForCalendarService,
  createMultipleSelectedCalendars,
} from "../mock_utils/utils";

// Mock dependencies
vi.mock("../../../_utils/oauth/getTokenObjectFromCredential");
vi.mock("../../lib/getOfficeAppKeys");
vi.mock("@calcom/features/calendar-cache/calendar-cache");

const log = logger.getSubLogger({ prefix: ["CalendarCache.test"] });

// Mock CalendarCache
const mockCalendarCache = {
  getCachedAvailability: vi.fn(),
  upsertCachedAvailability: vi.fn(),
};

beforeEach(async () => {
  vi.clearAllMocks();
  vi.mocked(getTokenObjectFromCredential).mockReturnValue({
    access_token: "mock_access_token",
    refresh_token: "mock_refresh_token",
    expires_at: new Date(Date.now() + 3600 * 1000),
  });
  vi.mocked(getOfficeAppKeys).mockResolvedValue({
    client_id: "mock_client_id",
    client_secret: "mock_client_secret",
  });

  // Mock CalendarCache.init to return our mock
  const { CalendarCache } = await import("@calcom/features/calendar-cache/calendar-cache");
  vi.mocked(CalendarCache.init).mockResolvedValue(mockCalendarCache as any);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Office365CalendarCache - Cache Operations", () => {
  describe("Cache Hit/Miss Scenarios", () => {
    test("should return cached data on cache HIT", async () => {
      const credentialInDb = await createCredentialForCalendarService();
      const calendars = await createMultipleSelectedCalendars(credentialInDb.userId!, credentialInDb.id, 3);
      const calendarService = new Office365CalendarService(credentialInDb);
      const calendarCache = new Office365CalendarCache(calendarService);

      const mockBusyTimes = generateMockData.busyTimes();
      const { dateFrom, dateTo } = calendarCacheHelpers.getDatePair();
      const calendarIds = calendars.map((cal) => cal.externalId);

      // Mock cache hit - return the cached data
      mockCalendarCache.getCachedAvailability.mockResolvedValue({
        value: mockBusyTimes,
        expiresAt: calendarCacheHelpers.FUTURE_EXPIRATION_DATE,
      });

      const fetcherSpy = vi.spyOn(calendarService, "fetcher" as any);

      const result = await calendarCache.getCacheOrFetchAvailability(
        dateFrom,
        dateTo,
        calendarIds,
        true // Explicitly set shouldServeCache to true
      );

      // Should return cached data without API calls
      expect(result).toEqual(mockBusyTimes);
      expect(fetcherSpy).not.toHaveBeenCalled();
      expect(mockCalendarCache.getCachedAvailability).toHaveBeenCalledWith({
        credentialId: credentialInDb.id,
        userId: credentialInDb.userId,
        args: {
          timeMin: dateFrom,
          timeMax: dateTo,
          items: calendarIds.map((id) => ({ id })),
        },
      });

      fetcherSpy.mockRestore();
    });

    test("should fetch fresh data on cache MISS and update cache", async () => {
      const credentialInDb = await createCredentialForCalendarService();
      const calendars = await createMultipleSelectedCalendars(credentialInDb.userId!, credentialInDb.id, 2);
      const calendarService = new Office365CalendarService(credentialInDb);
      const calendarCache = new Office365CalendarCache(calendarService);

      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(defaultFetcherMockImplementation);

      const { dateFrom, dateTo } = calendarCacheHelpers.getDatePair();

      // Mock cache miss - return null
      mockCalendarCache.getCachedAvailability.mockResolvedValue(null);

      // No cache exists - should trigger fetch
      const result = await calendarCache.getCacheOrFetchAvailability(
        dateFrom,
        dateTo,
        calendars.map((cal) => cal.externalId),
        true // Set shouldServeCache to true to test cache miss scenario
      );

      // Should make API calls to fetch fresh data
      expect(fetcherSpy).toHaveBeenCalled();
      expect(result).toBeDefined();

      // Verify cache was checked
      expect(mockCalendarCache.getCachedAvailability).toHaveBeenCalled();

      fetcherSpy.mockRestore();
    });

    test("should handle cache expiration and refresh", async () => {
      const credentialInDb = await createCredentialForCalendarService();
      const calendars = await createMultipleSelectedCalendars(credentialInDb.userId!, credentialInDb.id, 2);
      const calendarService = new Office365CalendarService(credentialInDb);
      const calendarCache = new Office365CalendarCache(calendarService);

      // Create expired cache
      const expiredDate = new Date(Date.now() - 100000); // 100 seconds ago
      await calendarCacheHelpers.setCache({
        credentialId: credentialInDb.id,
        key: JSON.stringify({
          timeMin: TEST_DATES.AVAILABILITY_START,
          timeMax: TEST_DATES.AVAILABILITY_END,
          items: calendars.map((cal) => ({ id: cal.externalId })),
        }),
        value: JSON.stringify([{ start: TEST_DATES.TOMORROW_9AM, end: TEST_DATES.TOMORROW_10AM }]),
        userId: credentialInDb.userId!,
        expiresAt: expiredDate,
      });

      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(defaultFetcherMockImplementation);

      const { dateFrom, dateTo } = calendarCacheHelpers.getDatePair();

      // Should detect expired cache and refresh
      const result = await calendarCache.getCacheOrFetchAvailability(
        dateFrom,
        dateTo,
        calendars.map((cal) => cal.externalId)
      );

      // Should make API calls due to expired cache
      expect(fetcherSpy).toHaveBeenCalled();
      expect(result).toBeDefined();

      fetcherSpy.mockRestore();
    });
  });

  describe("Cache Update Operations", () => {
    test("should update cache with fresh data", async () => {
      const credentialInDb = await createCredentialForCalendarService();
      const calendars = await createMultipleSelectedCalendars(credentialInDb.userId!, credentialInDb.id, 2);
      const calendarService = new Office365CalendarService(credentialInDb);
      const calendarCache = new Office365CalendarCache(calendarService);

      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(defaultFetcherMockImplementation);

      // Mock cache miss for initial check
      mockCalendarCache.getCachedAvailability.mockResolvedValue(null);

      // Update cache with fresh data
      await calendarCache.updateCache(calendars);

      // Should make API calls to fetch fresh data
      expect(fetcherSpy).toHaveBeenCalled();

      // Verify cache was updated via mock
      expect(mockCalendarCache.upsertCachedAvailability).toHaveBeenCalledWith({
        credentialId: credentialInDb.id,
        userId: credentialInDb.userId,
        args: expect.objectContaining({
          items: calendars.map((cal) => ({ id: cal.externalId })),
        }),
        value: expect.any(Array),
      });

      fetcherSpy.mockRestore();
    });

    test("should handle concurrent cache updates", async () => {
      const credential1 = await createCredentialForCalendarService({ user: { email: "user1@example.com" } });
      const credential2 = await createCredentialForCalendarService({ user: { email: "user2@example.com" } });

      const calendars1 = await createMultipleSelectedCalendars(credential1.userId!, credential1.id, 2);
      const calendars2 = await createMultipleSelectedCalendars(credential2.userId!, credential2.id, 2);

      const calendarService1 = new Office365CalendarService(credential1);
      const calendarService2 = new Office365CalendarService(credential2);

      const calendarCache1 = new Office365CalendarCache(calendarService1);
      const calendarCache2 = new Office365CalendarCache(calendarService2);

      const fetcherSpy1 = vi
        .spyOn(calendarService1, "fetcher" as any)
        .mockImplementation(defaultFetcherMockImplementation);
      const fetcherSpy2 = vi
        .spyOn(calendarService2, "fetcher" as any)
        .mockImplementation(defaultFetcherMockImplementation);

      // Mock cache miss for both credentials
      mockCalendarCache.getCachedAvailability.mockResolvedValue(null);

      // Concurrent cache updates
      await Promise.all([calendarCache1.updateCache(calendars1), calendarCache2.updateCache(calendars2)]);

      // Both should complete successfully
      expect(fetcherSpy1).toHaveBeenCalled();
      expect(fetcherSpy2).toHaveBeenCalled();

      // Verify both caches were updated via mock calls
      expect(mockCalendarCache.upsertCachedAvailability).toHaveBeenCalledWith({
        credentialId: credential1.id,
        userId: credential1.userId,
        args: expect.objectContaining({
          items: calendars1.map((cal) => ({ id: cal.externalId })),
        }),
        value: expect.any(Array),
      });
      expect(mockCalendarCache.upsertCachedAvailability).toHaveBeenCalledWith({
        credentialId: credential2.id,
        userId: credential2.userId,
        args: expect.objectContaining({
          items: calendars2.map((cal) => ({ id: cal.externalId })),
        }),
        value: expect.any(Array),
      });

      fetcherSpy1.mockRestore();
      fetcherSpy2.mockRestore();
    });
  });
});
