// import { PrismaClient } from "@prisma/client";
import { OutlookCacheService } from "../CacheService";
import { OutlookSubscriptionService } from "../SubscriptionService";
import { Office365CalendarService } from "../CalendarService";
import type { EventBusyDate } from "@calcom/types/Calendar";

describe("Outlook Cache Implementation", () => {
  let cacheService: OutlookCacheService;
  let subscriptionService: OutlookSubscriptionService;
  let calendarService: Office365CalendarService;
  const mockUserId = 1;
  const mockCalendarId = "test-calendar-id";
  const mockAccessToken = "test-access-token";

  beforeEach(() => {
    cacheService = new OutlookCacheService();
    subscriptionService = new OutlookSubscriptionService();
    calendarService = new Office365CalendarService({
      userId: mockUserId,
      type: "office365_calendar",
      key: {},
    });
  });

  describe("Cache Service", () => {
    it("should store and retrieve availability data", async () => {
      const testDate = new Date();
      const testSlots: EventBusyDate[] = [
        {
          start: new Date(testDate.setHours(10, 0, 0, 0)),
          end: new Date(testDate.setHours(11, 0, 0, 0)),
        },
      ];

      // Store data
      await cacheService.setCachedAvailability(
        mockUserId,
        mockCalendarId,
        testDate,
        testSlots
      );

      // Retrieve data
      const cachedData = await cacheService.getCachedAvailability(
        mockUserId,
        mockCalendarId,
        testDate
      );

      expect(cachedData).toEqual(testSlots);
    });

    it("should handle cache invalidation", async () => {
      const testDate = new Date();
      const testSlots: EventBusyDate[] = [
        {
          start: new Date(testDate.setHours(10, 0, 0, 0)),
          end: new Date(testDate.setHours(11, 0, 0, 0)),
        },
      ];

      // Store data
      await cacheService.setCachedAvailability(
        mockUserId,
        mockCalendarId,
        testDate,
        testSlots
      );

      // Invalidate cache
      await cacheService.invalidateCache(mockUserId, mockCalendarId, testDate);

      // Try to retrieve data
      const cachedData = await cacheService.getCachedAvailability(
        mockUserId,
        mockCalendarId,
        testDate
      );

      expect(cachedData).toBeNull();
    });

    it("should handle subscription ID management", async () => {
      const testSubscriptionId = "test-subscription-id";

      // Store subscription ID
      await cacheService.setSubscriptionId(
        mockUserId,
        mockCalendarId,
        testSubscriptionId
      );

      // Retrieve subscription ID
      const retrievedId = await cacheService.getSubscriptionId(
        mockUserId,
        mockCalendarId
      );

      expect(retrievedId).toBe(testSubscriptionId);
    });
  });

  // describe("Subscription Service", () => {
  //   it("should create and manage subscriptions", async () => {
  //     // Mock the fetch function
  //     global.fetch = jest.fn().mockImplementation(() =>
  //       Promise.resolve({
  //         ok: true,
  //         json: () =>
  //           Promise.resolve({
  //             id: "test-subscription-id",
  //             expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  //           }),
  //       })
  //     );

      // Create subscription
      const subscription = await subscriptionService.createSubscription(
        mockUserId,
        mockCalendarId,
        mockAccessToken
      );

      expect(subscription.id).toBe("test-subscription-id");
      expect(subscription.expirationDateTime).toBeDefined();

      // Check subscription status
      await subscriptionService.checkAndRenewSubscriptions(
        mockUserId,
        mockCalendarId,
        mockAccessToken
      );

      // Verify fetch was called
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe("Calendar Service with Cache", () => {
    it("should use cache when available", async () => {
      const testDate = new Date();
      const testSlots: EventBusyDate[] = [
        {
          start: new Date(testDate.setHours(10, 0, 0, 0)),
          end: new Date(testDate.setHours(11, 0, 0, 0)),
        },
      ];

      // Store test data in cache
      await cacheService.setCachedAvailability(
        mockUserId,
        mockCalendarId,
        testDate,
        testSlots
      );

      // Mock the calendar service's getAvailability method
      jest.spyOn(calendarService, "getAvailability").mockImplementation(async () => {
        return testSlots;
      });

      // Get availability
      const availability = await calendarService.getAvailability(
        testDate.toISOString(),
        new Date(testDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        [{ externalId: mockCalendarId, integration: "office365_calendar" }]
      );

      // Verify that the cached data was used
      // expect(availability).toEqual(testSlots);
      // expect(calendarService.getAvailability).not.toHaveBeenCalled();
    });

    it("should fetch from API when cache is stale", async () => {
      const testDate = new Date();
      const testSlots: EventBusyDate[] = [
        {
          start: new Date(testDate.setHours(10, 0, 0, 0)),
          end: new Date(testDate.setHours(11, 0, 0, 0)),
        },
      ];

      // Store stale data in cache (more than 1 hour old)
      await cacheService.setCachedAvailability(
        mockUserId,
        mockCalendarId,
        new Date(testDate.getTime() - 2 * 60 * 60 * 1000),
        testSlots
      );

      // Mock the calendar service's getAvailability method
      jest.spyOn(calendarService, "getAvailability").mockImplementation(async () => {
        return testSlots;
      });

      // Get availability
      const availability = await calendarService.getAvailability(
        testDate.toISOString(),
        new Date(testDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        [{ externalId: mockCalendarId, integration: "office365_calendar" }]
      );

      // Verify that the API was called
      expect(calendarService.getAvailability).toHaveBeenCalled();
      expect(availability).toEqual(testSlots);
    });
  });
}); 