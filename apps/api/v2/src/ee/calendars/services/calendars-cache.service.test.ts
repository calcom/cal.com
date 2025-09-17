import { describe, expect, it, beforeEach, vi } from "vitest";

import {
  CalendarsCacheService,
  REDIS_CALENDARS_CACHE_KEY,
  CALENDARS_CACHE_TTL_MS,
} from "./calendars-cache.service";

const mockRedisService = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
};

describe("CalendarsCacheService", () => {
  let service: CalendarsCacheService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CalendarsCacheService(mockRedisService as any);
  });

  describe("getConnectedAndDestinationCalendarsCache", () => {
    it("should retrieve cached calendars from Redis", async () => {
      const userId = 123;
      const cachedData = {
        connectedCalendars: [
          {
            integration: {
              type: "google_calendar",
              title: "Google Calendar",
            },
            calendars: [
              {
                externalId: "primary",
                name: "Primary Calendar",
                primary: true,
              },
            ],
          },
        ],
        destinationCalendar: {
          id: 1,
          integration: "google_calendar",
          externalId: "primary",
          userId: 123,
        },
      };

      mockRedisService.get.mockResolvedValue(cachedData);

      const result = await service.getConnectedAndDestinationCalendarsCache(userId);

      expect(mockRedisService.get).toHaveBeenCalledWith(REDIS_CALENDARS_CACHE_KEY(userId));
      expect(result).toEqual(cachedData);
    });

    it("should return null when no cache exists", async () => {
      const userId = 123;
      mockRedisService.get.mockResolvedValue(null);

      const result = await service.getConnectedAndDestinationCalendarsCache(userId);

      expect(mockRedisService.get).toHaveBeenCalledWith(REDIS_CALENDARS_CACHE_KEY(userId));
      expect(result).toBeNull();
    });

    it("should handle Redis errors gracefully", async () => {
      const userId = 123;
      mockRedisService.get.mockRejectedValue(new Error("Redis connection error"));

      await expect(service.getConnectedAndDestinationCalendarsCache(userId)).rejects.toThrow(
        "Redis connection error"
      );
    });
  });

  describe("setConnectedAndDestinationCalendarsCache", () => {
    it("should store calendars in Redis with TTL", async () => {
      const userId = 123;
      const calendarsData = {
        connectedCalendars: [
          {
            integration: {
              type: "google_calendar",
              title: "Google Calendar",
            },
            calendars: [
              {
                externalId: "primary",
                name: "Primary Calendar",
                primary: true,
              },
            ],
          },
        ],
        destinationCalendar: {
          id: 1,
          integration: "google_calendar",
          externalId: "primary",
          userId: 123,
        },
      };

      await service.setConnectedAndDestinationCalendarsCache(userId, calendarsData);

      expect(mockRedisService.set).toHaveBeenCalledWith(REDIS_CALENDARS_CACHE_KEY(userId), calendarsData, {
        ttl: CALENDARS_CACHE_TTL_MS,
      });
    });

    it("should handle Redis errors when setting cache", async () => {
      const userId = 123;
      const calendarsData = { connectedCalendars: [], destinationCalendar: null };
      mockRedisService.set.mockRejectedValue(new Error("Redis write error"));

      await expect(service.setConnectedAndDestinationCalendarsCache(userId, calendarsData)).rejects.toThrow(
        "Redis write error"
      );
    });

    it("should handle empty calendars data", async () => {
      const userId = 123;
      const calendarsData = { connectedCalendars: [], destinationCalendar: null };

      await service.setConnectedAndDestinationCalendarsCache(userId, calendarsData);

      expect(mockRedisService.set).toHaveBeenCalledWith(REDIS_CALENDARS_CACHE_KEY(userId), calendarsData, {
        ttl: CALENDARS_CACHE_TTL_MS,
      });
    });
  });

  describe("deleteConnectedAndDestinationCalendarsCache", () => {
    it("should delete cache from Redis", async () => {
      const userId = 123;

      await service.deleteConnectedAndDestinationCalendarsCache(userId);

      expect(mockRedisService.del).toHaveBeenCalledWith(REDIS_CALENDARS_CACHE_KEY(userId));
    });

    it("should handle Redis errors when deleting cache", async () => {
      const userId = 123;
      mockRedisService.del.mockRejectedValue(new Error("Redis delete error"));

      await expect(service.deleteConnectedAndDestinationCalendarsCache(userId)).rejects.toThrow(
        "Redis delete error"
      );
    });

    it("should handle deletion of non-existent cache", async () => {
      const userId = 123;
      mockRedisService.del.mockResolvedValue(0);

      await expect(service.deleteConnectedAndDestinationCalendarsCache(userId)).resolves.not.toThrow();
    });
  });

  describe("cache key generation", () => {
    it("should generate correct cache key for user", () => {
      const userId = 123;
      const expectedKey = "apiv2:user:123:calendars";

      expect(REDIS_CALENDARS_CACHE_KEY(userId)).toBe(expectedKey);
    });

    it("should generate unique keys for different users", () => {
      const userId1 = 123;
      const userId2 = 456;

      const key1 = REDIS_CALENDARS_CACHE_KEY(userId1);
      const key2 = REDIS_CALENDARS_CACHE_KEY(userId2);

      expect(key1).not.toBe(key2);
      expect(key1).toBe("apiv2:user:123:calendars");
      expect(key2).toBe("apiv2:user:456:calendars");
    });
  });

  describe("TTL configuration", () => {
    it("should use correct TTL value", () => {
      expect(CALENDARS_CACHE_TTL_MS).toBe(10_000);
    });
  });
});
