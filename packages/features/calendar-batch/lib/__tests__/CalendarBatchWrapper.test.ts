import { describe, test, expect, vi, beforeEach } from "vitest";

import type { Calendar, CalendarEvent, CalendarServiceEvent, EventBusyDate, IntegrationCalendar } from "@calcom/types/Calendar";

import { CalendarBatchWrapper } from "../CalendarBatchWrapper";

describe("CalendarBatchWrapper", () => {
  let mockOriginalCalendar: Calendar;
  let getAvailabilityMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getAvailabilityMock = vi.fn().mockResolvedValue([]);

    mockOriginalCalendar = {
      getAvailability: getAvailabilityMock,
      createEvent: vi.fn(),
      updateEvent: vi.fn(),
      deleteEvent: vi.fn(),
      listCalendars: vi.fn().mockResolvedValue([]),
    } as unknown as Calendar;
  });

  describe("getAvailability batching behavior", () => {
    test("should make separate calls for calendars without delegationCredentialId", async () => {
      const wrapper = new CalendarBatchWrapper({ originalCalendar: mockOriginalCalendar });

      const selectedCalendars: IntegrationCalendar[] = [
        { externalId: "cal1@test.com", integration: "google_calendar" },
        { externalId: "cal2@test.com", integration: "google_calendar" },
        { externalId: "cal3@test.com", integration: "google_calendar" },
      ];

      getAvailabilityMock.mockResolvedValue([{ start: "2024-01-01T10:00:00Z", end: "2024-01-01T11:00:00Z" }]);

      await wrapper.getAvailability("2024-01-01", "2024-01-31", selectedCalendars, undefined, false);

      // Each calendar without delegationCredentialId should be processed separately
      expect(getAvailabilityMock).toHaveBeenCalledTimes(3);
      expect(getAvailabilityMock).toHaveBeenNthCalledWith(
        1,
        "2024-01-01",
        "2024-01-31",
        [selectedCalendars[0]],
        undefined,
        false
      );
      expect(getAvailabilityMock).toHaveBeenNthCalledWith(
        2,
        "2024-01-01",
        "2024-01-31",
        [selectedCalendars[1]],
        undefined,
        false
      );
      expect(getAvailabilityMock).toHaveBeenNthCalledWith(
        3,
        "2024-01-01",
        "2024-01-31",
        [selectedCalendars[2]],
        undefined,
        false
      );
    });

    test("should batch calendars with the same delegationCredentialId together", async () => {
      const wrapper = new CalendarBatchWrapper({ originalCalendar: mockOriginalCalendar });

      const selectedCalendars: IntegrationCalendar[] = [
        { externalId: "cal1@test.com", integration: "google_calendar", delegationCredentialId: "delegation-1" },
        { externalId: "cal2@test.com", integration: "google_calendar", delegationCredentialId: "delegation-1" },
        { externalId: "cal3@test.com", integration: "google_calendar", delegationCredentialId: "delegation-2" },
      ];

      await wrapper.getAvailability("2024-01-01", "2024-01-31", selectedCalendars, undefined, false);

      // Should make 2 calls: one for delegation-1 (batched), one for delegation-2
      expect(getAvailabilityMock).toHaveBeenCalledTimes(2);

      // First call should have both calendars from delegation-1
      expect(getAvailabilityMock).toHaveBeenNthCalledWith(
        1,
        "2024-01-01",
        "2024-01-31",
        [selectedCalendars[0], selectedCalendars[1]],
        undefined,
        false
      );

      // Second call should have the calendar from delegation-2
      expect(getAvailabilityMock).toHaveBeenNthCalledWith(
        2,
        "2024-01-01",
        "2024-01-31",
        [selectedCalendars[2]],
        undefined,
        false
      );
    });

    test("should chunk delegated calendars into groups of 50 for API limits", async () => {
      const wrapper = new CalendarBatchWrapper({ originalCalendar: mockOriginalCalendar });

      // Create 120 calendars with the same delegationCredentialId
      const selectedCalendars: IntegrationCalendar[] = Array.from({ length: 120 }, (_, i) => ({
        externalId: `cal${i}@test.com`,
        integration: "google_calendar",
        delegationCredentialId: "delegation-1",
      }));

      await wrapper.getAvailability("2024-01-01", "2024-01-31", selectedCalendars, undefined, false);

      // Should make 3 calls: 50 + 50 + 20
      expect(getAvailabilityMock).toHaveBeenCalledTimes(3);

      // First chunk should have 50 calendars
      const firstCallCalendars = getAvailabilityMock.mock.calls[0][2];
      expect(firstCallCalendars).toHaveLength(50);

      // Second chunk should have 50 calendars
      const secondCallCalendars = getAvailabilityMock.mock.calls[1][2];
      expect(secondCallCalendars).toHaveLength(50);

      // Third chunk should have 20 calendars
      const thirdCallCalendars = getAvailabilityMock.mock.calls[2][2];
      expect(thirdCallCalendars).toHaveLength(20);
    });

    test("should handle mixed calendars with and without delegationCredentialId", async () => {
      const wrapper = new CalendarBatchWrapper({ originalCalendar: mockOriginalCalendar });

      const selectedCalendars: IntegrationCalendar[] = [
        { externalId: "own1@test.com", integration: "google_calendar" },
        { externalId: "delegated1@test.com", integration: "google_calendar", delegationCredentialId: "delegation-1" },
        { externalId: "delegated2@test.com", integration: "google_calendar", delegationCredentialId: "delegation-1" },
        { externalId: "own2@test.com", integration: "google_calendar" },
      ];

      await wrapper.getAvailability("2024-01-01", "2024-01-31", selectedCalendars, undefined, false);

      // Should make 3 calls: 2 for own credentials (one each), 1 for delegation-1 (batched)
      expect(getAvailabilityMock).toHaveBeenCalledTimes(3);
    });

    test("should make a single call with empty array when no calendars provided to honor fallbackToPrimary", async () => {
      const wrapper = new CalendarBatchWrapper({ originalCalendar: mockOriginalCalendar });

      await wrapper.getAvailability("2024-01-01", "2024-01-31", [], undefined, true);

      // Should make exactly 1 call with empty array so fallbackToPrimary can be honored
      expect(getAvailabilityMock).toHaveBeenCalledTimes(1);
      expect(getAvailabilityMock).toHaveBeenCalledWith("2024-01-01", "2024-01-31", [], undefined, true);
    });

    test("should flatten and combine results from all batched calls", async () => {
      const wrapper = new CalendarBatchWrapper({ originalCalendar: mockOriginalCalendar });

      const selectedCalendars: IntegrationCalendar[] = [
        { externalId: "cal1@test.com", integration: "google_calendar", delegationCredentialId: "delegation-1" },
        { externalId: "cal2@test.com", integration: "google_calendar", delegationCredentialId: "delegation-2" },
      ];

      const busyTimes1: EventBusyDate[] = [{ start: new Date("2024-01-01T10:00:00Z"), end: new Date("2024-01-01T11:00:00Z") }];
      const busyTimes2: EventBusyDate[] = [{ start: new Date("2024-01-02T14:00:00Z"), end: new Date("2024-01-02T15:00:00Z") }];

      getAvailabilityMock
        .mockResolvedValueOnce(busyTimes1)
        .mockResolvedValueOnce(busyTimes2);

      const result = await wrapper.getAvailability("2024-01-01", "2024-01-31", selectedCalendars, undefined, false);

      // Should return combined results from both calls
      expect(result).toHaveLength(2);
      expect(result).toEqual([...busyTimes1, ...busyTimes2]);
    });
  });

  describe("pass-through methods", () => {
    test("createEvent should delegate to original calendar", async () => {
      const wrapper = new CalendarBatchWrapper({ originalCalendar: mockOriginalCalendar });
      const mockEvent = { title: "Test Event" } as unknown as CalendarServiceEvent;

      await wrapper.createEvent(mockEvent, 1, "calendar@test.com");

      expect(mockOriginalCalendar.createEvent).toHaveBeenCalledWith(mockEvent, 1, "calendar@test.com");
    });

    test("updateEvent should delegate to original calendar", async () => {
      const wrapper = new CalendarBatchWrapper({ originalCalendar: mockOriginalCalendar });
      const mockEvent = { title: "Updated Event" } as unknown as CalendarServiceEvent;

      await wrapper.updateEvent("event-uid", mockEvent, "calendar@test.com");

      expect(mockOriginalCalendar.updateEvent).toHaveBeenCalledWith("event-uid", mockEvent, "calendar@test.com");
    });

    test("deleteEvent should delegate to original calendar", async () => {
      const wrapper = new CalendarBatchWrapper({ originalCalendar: mockOriginalCalendar });
      const mockEvent = { title: "Event to Delete" } as unknown as CalendarEvent;

      await wrapper.deleteEvent("event-uid", mockEvent, "calendar@test.com");

      expect(mockOriginalCalendar.deleteEvent).toHaveBeenCalledWith("event-uid", mockEvent, "calendar@test.com");
    });

    test("listCalendars should delegate to original calendar", async () => {
      const wrapper = new CalendarBatchWrapper({ originalCalendar: mockOriginalCalendar });

      await wrapper.listCalendars();

      expect(mockOriginalCalendar.listCalendars).toHaveBeenCalled();
    });
  });
});
