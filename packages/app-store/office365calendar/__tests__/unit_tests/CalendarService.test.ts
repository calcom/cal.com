import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";
import "vitest-fetch-mock";

import logger from "@calcom/lib/logger";

import { getTokenObjectFromCredential } from "../../../_utils/oauth/getTokenObjectFromCredential";
import Office365CalendarService from "../../lib/CalendarService";
import { getOfficeAppKeys } from "../../lib/getOfficeAppKeys";
import { TEST_DATES } from "../dates";
import { defaultFetcherMockImplementation } from "../mock_utils/mocks";
import { createCredentialForCalendarService, createMultipleSelectedCalendars } from "../mock_utils/utils";
import { PerformanceTestUtils } from "./shared/performance.utils";

// Mock dependencies
vi.mock("../../../_utils/oauth/getTokenObjectFromCredential");
vi.mock("../../lib/getOfficeAppKeys");

const log = logger.getSubLogger({ prefix: ["CalendarService.test"] });

beforeEach(() => {
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
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Office365CalendarService - Core Functionality", () => {
  describe("Calendar Service Initialization", () => {
    test("should initialize calendar service with valid credentials", async () => {
      const credential = await createCredentialForCalendarService();
      const calendarService = new Office365CalendarService(credential);

      expect(calendarService).toBeDefined();
      expect(calendarService).toBeInstanceOf(Office365CalendarService);
    });

    test("should handle invalid credentials gracefully", async () => {
      const invalidCredential = {
        id: 999,
        type: "office365_calendar",
        key: { invalid: "key" },
        userId: 1,
        appId: "office365calendar",
        invalid: false,
        teamId: null,
        delegationCredentialId: null,
        user: null,
      };

      expect(() => new Office365CalendarService(invalidCredential as any)).not.toThrow();
    });
  });

  describe("Single Calendar Operations", () => {
    test("should fetch availability for single calendar", async () => {
      const credential = await createCredentialForCalendarService();
      const calendarService = new Office365CalendarService(credential);
      const calendars = await createMultipleSelectedCalendars(credential.userId!, credential.id, 1);

      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(defaultFetcherMockImplementation);

      const result = await calendarService.getAvailability(
        TEST_DATES.AVAILABILITY_START,
        TEST_DATES.AVAILABILITY_END,
        calendars,
        false
      );

      expect(result).toBeDefined();
      expect(fetcherSpy).toHaveBeenCalled();

      fetcherSpy.mockRestore();
    });

    test("should create calendar event successfully", async () => {
      const credential = await createCredentialForCalendarService();
      const calendarService = new Office365CalendarService(credential);

      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(defaultFetcherMockImplementation);

      const eventData: any = {
        type: "test-event",
        title: "Test Event",
        startTime: TEST_DATES.TOMORROW_9AM,
        endTime: TEST_DATES.TOMORROW_10AM,
        description: "Test event description",
        organizer: {
          id: 1,
          name: "Test Organizer",
          email: "organizer@example.com",
          timeZone: "UTC",
          language: {
            translate: (key: string) => key, // Mock translate function
          },
        },
        attendees: [],
        destinationCalendar: [
          {
            externalId: "cal1",
            integration: "office365_calendar",
            credentialId: credential.id,
            userId: credential.userId,
          },
        ],
      };

      const result = await calendarService.createEvent(eventData, credential.id);

      expect(result).toBeDefined();
      expect(fetcherSpy).toHaveBeenCalledWith(
        expect.stringContaining("/calendars/cal1/events"),
        expect.objectContaining({ method: "POST" })
      );

      fetcherSpy.mockRestore();
    });

    test("should update calendar event successfully", async () => {
      const credential = await createCredentialForCalendarService();
      const calendarService = new Office365CalendarService(credential);

      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(defaultFetcherMockImplementation);

      const updateData: any = {
        type: "test-event",
        title: "Updated Test Event",
        startTime: TEST_DATES.TOMORROW_2PM,
        endTime: TEST_DATES.TOMORROW_3PM,
        organizer: {
          id: 1,
          name: "Test Organizer",
          email: "organizer@example.com",
          timeZone: "UTC",
          language: {
            translate: (key: string) => key, // Mock translate function
          },
        },
        attendees: [],
      };

      const result = await calendarService.updateEvent("event123", updateData);

      expect(result).toBeDefined();
      expect(fetcherSpy).toHaveBeenCalledWith(
        expect.stringContaining("/calendar/events/event123"),
        expect.objectContaining({ method: "PATCH" })
      );

      fetcherSpy.mockRestore();
    });

    test("should delete calendar event successfully", async () => {
      const credential = await createCredentialForCalendarService();
      const calendarService = new Office365CalendarService(credential);

      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(defaultFetcherMockImplementation);

      const result = await calendarService.deleteEvent("event123");

      expect(result).toBeUndefined(); // deleteEvent returns void
      expect(fetcherSpy).toHaveBeenCalledWith(
        expect.stringContaining("/calendar/events/event123"),
        expect.objectContaining({ method: "DELETE" })
      );

      fetcherSpy.mockRestore();
    });
  });

  describe("Multiple Calendar Batch Operations", () => {
    test("should use batch API calls for multiple calendars", async () => {
      const credential = await createCredentialForCalendarService();
      const calendarService = new Office365CalendarService(credential);
      const calendars = await createMultipleSelectedCalendars(credential.userId!, credential.id, 5);

      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(defaultFetcherMockImplementation);

      await calendarService.getAvailability(
        TEST_DATES.AVAILABILITY_START,
        TEST_DATES.AVAILABILITY_END,
        calendars,
        false
      );

      // Use shared performance utilities for validation
      PerformanceTestUtils.expectBatchOptimization(fetcherSpy as any, 1);
      PerformanceTestUtils.validateOptimization(
        PerformanceTestUtils.measureApiCalls(fetcherSpy as any),
        calendars.length
      );

      fetcherSpy.mockRestore();
    });

    test("should handle pagination in batch operations", async () => {
      const credential = await createCredentialForCalendarService();
      const calendarService = new Office365CalendarService(credential);
      const calendars = await createMultipleSelectedCalendars(credential.userId!, credential.id, 3);

      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(async (endpoint, options) => {
          if (typeof endpoint === "string" && endpoint.includes("/$batch")) {
            return {
              status: 200,
              json: async () => ({
                responses: calendars.map((_, index) => ({
                  id: index.toString(),
                  status: 200,
                  body: {
                    value: [
                      {
                        start: { dateTime: TEST_DATES.TOMORROW_9AM },
                        end: { dateTime: TEST_DATES.TOMORROW_10AM },
                        subject: `Event ${index}`,
                      },
                    ],
                    "@odata.nextLink": index === 0 ? "https://graph.microsoft.com/next" : undefined,
                  },
                })),
              }),
            };
          }
          return defaultFetcherMockImplementation(endpoint, options);
        });

      const result = await calendarService.getAvailability(
        TEST_DATES.AVAILABILITY_START,
        TEST_DATES.AVAILABILITY_END,
        calendars,
        false
      );

      expect(result).toBeDefined();
      expect(fetcherSpy).toHaveBeenCalled();

      // Should handle pagination efficiently
      const apiCalls = PerformanceTestUtils.measureApiCalls(fetcherSpy as any);
      expect(apiCalls.batch).toBeGreaterThan(0);

      fetcherSpy.mockRestore();
    });
  });

  describe("Calendar Listing and Management", () => {
    test("should list user calendars", async () => {
      const credential = await createCredentialForCalendarService();
      const calendarService = new Office365CalendarService(credential);

      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(defaultFetcherMockImplementation);

      const result = await calendarService.listCalendars();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // The listCalendars method makes three calls:
      // 1. /me (from getAzureUserId)
      // 2. To get calendars: /users/{email}/calendars?$select=id,name,isDefaultCalendar,canEdit
      // 3. To get user info: /users/{email}
      expect(fetcherSpy).toHaveBeenCalledTimes(3);
      expect(fetcherSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\/users\/.*\/calendars\?\$select=id,name,isDefaultCalendar,canEdit/)
      );
      expect(fetcherSpy).toHaveBeenCalledWith(expect.stringMatching(/\/users\/.*$/));

      fetcherSpy.mockRestore();
    });
  });

  describe("Date Range Operations", () => {
    test("should handle different date ranges efficiently", async () => {
      const credential = await createCredentialForCalendarService();
      const calendarService = new Office365CalendarService(credential);
      const calendars = await createMultipleSelectedCalendars(credential.userId!, credential.id, 2);

      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(defaultFetcherMockImplementation);

      // Test different date ranges using available TEST_DATES properties
      const dateRanges = [
        { start: TEST_DATES.CURRENT_WEEK_START_ISO, end: TEST_DATES.CURRENT_WEEK_END_ISO },
        { start: TEST_DATES.NEXT_WEEK_START_ISO, end: TEST_DATES.NEXT_WEEK_END_ISO },
        { start: TEST_DATES.EXTENDED_START_ISO, end: TEST_DATES.EXTENDED_END_ISO },
      ];

      for (const range of dateRanges) {
        await calendarService.getAvailability(range.start, range.end, calendars, false);
      }

      // Should handle all date ranges efficiently
      const apiCalls = PerformanceTestUtils.measureApiCalls(fetcherSpy as any);
      expect(apiCalls.total).toBeLessThan(dateRanges.length * calendars.length);

      fetcherSpy.mockRestore();
    });

    test("should handle timezone conversions correctly", async () => {
      const credential = await createCredentialForCalendarService();
      const calendarService = new Office365CalendarService(credential);
      const calendars = await createMultipleSelectedCalendars(credential.userId!, credential.id, 1);

      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(defaultFetcherMockImplementation);

      // Test with different timezone formats
      const timezoneTests = [
        { start: "2024-01-01T09:00:00Z", end: "2024-01-01T17:00:00Z" },
        { start: "2024-01-01T09:00:00-05:00", end: "2024-01-01T17:00:00-05:00" },
        { start: "2024-01-01T09:00:00+01:00", end: "2024-01-01T17:00:00+01:00" },
      ];

      for (const test of timezoneTests) {
        const result = await calendarService.getAvailability(test.start, test.end, calendars, false);
        expect(result).toBeDefined();
      }

      fetcherSpy.mockRestore();
    });
  });
});
