import { describe, it, expect, vi, beforeEach } from "vitest";
import dayjs from "@calcom/dayjs";
import { ErrorCode } from "@calcom/lib/errorCodes";
import type { EventBusyDate, SelectedCalendar } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";
import { UserAvailabilityService } from "./getUserAvailability";
import type { IUserAvailabilityService } from "./getUserAvailability";

vi.mock("@calcom/features/calendars/lib/CalendarManager", () => ({
  getBusyCalendarTimes: vi.fn(),
}));

vi.mock("@calcom/features/eventtypes/repositories/eventTypeRepository", () => ({
  EventTypeRepository: {
    getSelectedCalendarsFromUser: vi.fn(),
  },
}));

vi.mock("@calcom/features/bookings/lib/conflictChecker/checkForConflicts", () => ({
  checkForConflicts: vi.fn(),
}));

import { getBusyCalendarTimes } from "@calcom/features/calendars/lib/CalendarManager";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { checkForConflicts } from "@calcom/features/bookings/lib/conflictChecker/checkForConflicts";

const mockGetBusyCalendarTimes = vi.mocked(getBusyCalendarTimes);
const mockGetSelectedCalendarsFromUser = vi.mocked(EventTypeRepository.getSelectedCalendarsFromUser);
const mockCheckForConflicts = vi.mocked(checkForConflicts);

describe("UserAvailabilityService.checkThirdPartyCalendarConflicts", () => {
  let service: UserAvailabilityService;
  let mockDependencies: IUserAvailabilityService;

  const createMockUser = (overrides = {}) => {
    const selectedCalendars: SelectedCalendar[] = [
      {
        userId: 1,
        integration: "google_calendar",
        externalId: "primary",
        credentialId: 1,
      },
    ];

    return {
      id: 1,
      username: "testuser",
      userLevelSelectedCalendars: selectedCalendars,
      ...overrides,
    };
  };

  const createMockEventType = (overrides = {}) => ({
    id: 1,
    useEventLevelSelectedCalendars: false,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockDependencies = {
      eventTypeRepo: {} as unknown as IUserAvailabilityService["eventTypeRepo"],
      oooRepo: {} as unknown as IUserAvailabilityService["oooRepo"],
      bookingRepo: {} as unknown as IUserAvailabilityService["bookingRepo"],
      redisClient: {} as unknown as IUserAvailabilityService["redisClient"],
    };

    service = new UserAvailabilityService(mockDependencies);
  });

  describe("No conflict scenarios", () => {
    it("should return hasConflict=false when no busy times overlap", async () => {
      const user = createMockUser();
      const eventType = createMockEventType();
      const credentials: CredentialForCalendarService[] = [];
      const dateFrom = "2025-01-01T12:00:00Z";
      const dateTo = "2025-01-01T12:30:00Z";

      const busyTimes: EventBusyDate[] = [
        {
          start: new Date("2025-01-01T10:00:00Z"),
          end: new Date("2025-01-01T11:00:00Z"),
          source: "google_calendar",
        },
        {
          start: new Date("2025-01-01T13:00:00Z"),
          end: new Date("2025-01-01T14:00:00Z"),
          source: "google_calendar",
        },
      ];

      mockGetBusyCalendarTimes.mockResolvedValue({
        success: true,
        data: busyTimes,
      });

      mockCheckForConflicts.mockReturnValue(false);

      const result = await service.checkThirdPartyCalendarConflicts({
        user,
        eventType,
        credentials,
        dateFrom,
        dateTo,
      });

      expect(result.hasConflict).toBe(false);
      expect(result.conflictingBusyTimes).toEqual([]);
      expect(mockGetBusyCalendarTimes).toHaveBeenCalledWith(
        credentials,
        dateFrom,
        dateTo,
        user.userLevelSelectedCalendars,
        false // shouldServeCache must be false
      );
    });

    it("should return hasConflict=false when no busy times exist", async () => {
      const user = createMockUser();
      const eventType = createMockEventType();
      const credentials: CredentialForCalendarService[] = [];
      const dateFrom = "2025-01-01T12:00:00Z";
      const dateTo = "2025-01-01T12:30:00Z";

      mockGetBusyCalendarTimes.mockResolvedValue({
        success: true,
        data: [],
      });

      mockCheckForConflicts.mockReturnValue(false);

      const result = await service.checkThirdPartyCalendarConflicts({
        user,
        eventType,
        credentials,
        dateFrom,
        dateTo,
      });

      expect(result.hasConflict).toBe(false);
      expect(result.conflictingBusyTimes).toEqual([]);
    });
  });

  describe("Conflict scenarios", () => {
    it("should return hasConflict=true when busy time overlaps", async () => {
      const user = createMockUser();
      const eventType = createMockEventType();
      const credentials: CredentialForCalendarService[] = [];
      const dateFrom = "2025-01-01T12:00:00Z";
      const dateTo = "2025-01-01T12:30:00Z";

      const busyTimes: EventBusyDate[] = [
        {
          start: new Date("2025-01-01T12:15:00Z"),
          end: new Date("2025-01-01T12:45:00Z"),
          source: "google_calendar",
        },
      ];

      mockGetBusyCalendarTimes.mockResolvedValue({
        success: true,
        data: busyTimes,
      });

      mockCheckForConflicts.mockReturnValue(true);

      const result = await service.checkThirdPartyCalendarConflicts({
        user,
        eventType,
        credentials,
        dateFrom,
        dateTo,
      });

      expect(result.hasConflict).toBe(true);
      expect(result.conflictingBusyTimes).toHaveLength(1);
      expect(result.conflictingBusyTimes[0]).toMatchObject({
        start: busyTimes[0].start,
        end: busyTimes[0].end,
        source: "google_calendar",
      });
    });
  });

  describe("Buffer scenarios", () => {
    it("should apply beforeEventBuffer and cause conflict", async () => {
      const user = createMockUser();
      const eventType = createMockEventType();
      const credentials: CredentialForCalendarService[] = [];
      const dateFrom = "2025-01-01T12:00:00Z";
      const dateTo = "2025-01-01T12:30:00Z";
      const beforeEventBuffer = 30; // 30 minutes

      const busyTimes: EventBusyDate[] = [
        {
          start: new Date("2025-01-01T11:30:00Z"),
          end: new Date("2025-01-01T11:45:00Z"),
          source: "google_calendar",
        },
      ];

      mockGetBusyCalendarTimes.mockResolvedValue({
        success: true,
        data: busyTimes,
      });

      mockCheckForConflicts.mockReturnValue(true);

      const result = await service.checkThirdPartyCalendarConflicts({
        user,
        eventType,
        credentials,
        dateFrom,
        dateTo,
        beforeEventBuffer,
      });

      expect(result.hasConflict).toBe(true);
      expect(result.conflictingBusyTimes).toHaveLength(1);
      
      const bufferedEnd = dayjs(busyTimes[0].end).add(beforeEventBuffer, "minute").toDate();
      expect(result.conflictingBusyTimes[0].end).toEqual(bufferedEnd);
    });

    it("should apply afterEventBuffer and cause conflict", async () => {
      const user = createMockUser();
      const eventType = createMockEventType();
      const credentials: CredentialForCalendarService[] = [];
      const dateFrom = "2025-01-01T12:00:00Z";
      const dateTo = "2025-01-01T12:30:00Z";
      const afterEventBuffer = 15; // 15 minutes

      const busyTimes: EventBusyDate[] = [
        {
          start: new Date("2025-01-01T12:30:00Z"),
          end: new Date("2025-01-01T12:40:00Z"),
          source: "google_calendar",
        },
      ];

      mockGetBusyCalendarTimes.mockResolvedValue({
        success: true,
        data: busyTimes,
      });

      mockCheckForConflicts.mockReturnValue(true);

      const result = await service.checkThirdPartyCalendarConflicts({
        user,
        eventType,
        credentials,
        dateFrom,
        dateTo,
        afterEventBuffer,
      });

      expect(result.hasConflict).toBe(true);
      expect(result.conflictingBusyTimes).toHaveLength(1);
      
      const bufferedStart = dayjs(busyTimes[0].start).subtract(afterEventBuffer, "minute").toDate();
      expect(result.conflictingBusyTimes[0].start).toEqual(bufferedStart);
    });

    it("should apply both buffers correctly", async () => {
      const user = createMockUser();
      const eventType = createMockEventType();
      const credentials: CredentialForCalendarService[] = [];
      const dateFrom = "2025-01-01T12:00:00Z";
      const dateTo = "2025-01-01T12:30:00Z";
      const beforeEventBuffer = 10;
      const afterEventBuffer = 10;

      const busyTimes: EventBusyDate[] = [
        {
          start: new Date("2025-01-01T12:20:00Z"),
          end: new Date("2025-01-01T12:25:00Z"),
          source: "google_calendar",
        },
      ];

      mockGetBusyCalendarTimes.mockResolvedValue({
        success: true,
        data: busyTimes,
      });

      mockCheckForConflicts.mockReturnValue(true);

      const result = await service.checkThirdPartyCalendarConflicts({
        user,
        eventType,
        credentials,
        dateFrom,
        dateTo,
        beforeEventBuffer,
        afterEventBuffer,
      });

      expect(result.hasConflict).toBe(true);
      
      const bufferedStart = dayjs(busyTimes[0].start).subtract(afterEventBuffer, "minute").toDate();
      const bufferedEnd = dayjs(busyTimes[0].end).add(beforeEventBuffer, "minute").toDate();
      expect(result.conflictingBusyTimes[0].start).toEqual(bufferedStart);
      expect(result.conflictingBusyTimes[0].end).toEqual(bufferedEnd);
    });
  });

  describe("Selected calendars source", () => {
    it("should use event-level selected calendars when useEventLevelSelectedCalendars=true", async () => {
      const eventLevelCalendars: SelectedCalendar[] = [
        {
          userId: 1,
          integration: "office365_calendar",
          externalId: "event-calendar",
          credentialId: 2,
        },
      ];

      const user = createMockUser();
      const eventType = createMockEventType({
        useEventLevelSelectedCalendars: true,
      });
      const credentials: CredentialForCalendarService[] = [];
      const dateFrom = "2025-01-01T12:00:00Z";
      const dateTo = "2025-01-01T12:30:00Z";

      mockGetSelectedCalendarsFromUser.mockReturnValue(eventLevelCalendars);
      mockGetBusyCalendarTimes.mockResolvedValue({
        success: true,
        data: [],
      });
      mockCheckForConflicts.mockReturnValue(false);

      await service.checkThirdPartyCalendarConflicts({
        user,
        eventType,
        credentials,
        dateFrom,
        dateTo,
      });

      expect(mockGetSelectedCalendarsFromUser).toHaveBeenCalledWith({
        user,
        eventTypeId: eventType.id,
      });
      expect(mockGetBusyCalendarTimes).toHaveBeenCalledWith(
        credentials,
        dateFrom,
        dateTo,
        eventLevelCalendars,
        false
      );
    });

    it("should use user-level selected calendars when useEventLevelSelectedCalendars=false", async () => {
      const user = createMockUser();
      const eventType = createMockEventType({
        useEventLevelSelectedCalendars: false,
      });
      const credentials: CredentialForCalendarService[] = [];
      const dateFrom = "2025-01-01T12:00:00Z";
      const dateTo = "2025-01-01T12:30:00Z";

      mockGetBusyCalendarTimes.mockResolvedValue({
        success: true,
        data: [],
      });
      mockCheckForConflicts.mockReturnValue(false);

      await service.checkThirdPartyCalendarConflicts({
        user,
        eventType,
        credentials,
        dateFrom,
        dateTo,
      });

      expect(mockGetSelectedCalendarsFromUser).not.toHaveBeenCalled();
      expect(mockGetBusyCalendarTimes).toHaveBeenCalledWith(
        credentials,
        dateFrom,
        dateTo,
        user.userLevelSelectedCalendars,
        false
      );
    });
  });

  describe("Cache bypass", () => {
    it("should always call getBusyCalendarTimes with shouldServeCache=false", async () => {
      const user = createMockUser();
      const eventType = createMockEventType();
      const credentials: CredentialForCalendarService[] = [];
      const dateFrom = "2025-01-01T12:00:00Z";
      const dateTo = "2025-01-01T12:30:00Z";

      mockGetBusyCalendarTimes.mockResolvedValue({
        success: true,
        data: [],
      });
      mockCheckForConflicts.mockReturnValue(false);

      await service.checkThirdPartyCalendarConflicts({
        user,
        eventType,
        credentials,
        dateFrom,
        dateTo,
      });

      expect(mockGetBusyCalendarTimes).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        false
      );
    });
  });

  describe("Error handling", () => {
    it("should throw NoAvailableUsersFound when getBusyCalendarTimes returns success=false", async () => {
      const user = createMockUser();
      const eventType = createMockEventType();
      const credentials: CredentialForCalendarService[] = [];
      const dateFrom = "2025-01-01T12:00:00Z";
      const dateTo = "2025-01-01T12:30:00Z";

      mockGetBusyCalendarTimes.mockResolvedValue({
        success: false,
        data: [{ start: dateFrom, end: dateTo, source: "error-placeholder" }],
      });

      await expect(
        service.checkThirdPartyCalendarConflicts({
          user,
          eventType,
          credentials,
          dateFrom,
          dateTo,
        })
      ).rejects.toThrow(ErrorCode.NoAvailableUsersFound);
    });
  });

  describe("Return payload details", () => {
    it("should return selectedCalendars with only externalId and integration", async () => {
      const user = createMockUser({
        userLevelSelectedCalendars: [
          {
            userId: 1,
            integration: "google_calendar",
            externalId: "primary",
            credentialId: 1,
          },
          {
            userId: 1,
            integration: "office365_calendar",
            externalId: "work-calendar",
            credentialId: 2,
          },
        ],
      });
      const eventType = createMockEventType();
      const credentials: CredentialForCalendarService[] = [];
      const dateFrom = "2025-01-01T12:00:00Z";
      const dateTo = "2025-01-01T12:30:00Z";

      mockGetBusyCalendarTimes.mockResolvedValue({
        success: true,
        data: [],
      });
      mockCheckForConflicts.mockReturnValue(false);

      const result = await service.checkThirdPartyCalendarConflicts({
        user,
        eventType,
        credentials,
        dateFrom,
        dateTo,
      });

      expect(result.selectedCalendars).toEqual([
        {
          externalId: "primary",
          integration: "google_calendar",
        },
        {
          externalId: "work-calendar",
          integration: "office365_calendar",
        },
      ]);
      
      expect(result.selectedCalendars[0]).not.toHaveProperty("credentialId");
      expect(result.selectedCalendars[0]).not.toHaveProperty("userId");
    });

    it("should return buffer-adjusted busy times when conflict exists", async () => {
      const user = createMockUser();
      const eventType = createMockEventType();
      const credentials: CredentialForCalendarService[] = [];
      const dateFrom = "2025-01-01T12:00:00Z";
      const dateTo = "2025-01-01T12:30:00Z";
      const beforeEventBuffer = 10;
      const afterEventBuffer = 5;

      const originalBusyTime = {
        start: new Date("2025-01-01T12:10:00Z"),
        end: new Date("2025-01-01T12:20:00Z"),
        source: "google_calendar",
      };

      mockGetBusyCalendarTimes.mockResolvedValue({
        success: true,
        data: [originalBusyTime],
      });
      mockCheckForConflicts.mockReturnValue(true);

      const result = await service.checkThirdPartyCalendarConflicts({
        user,
        eventType,
        credentials,
        dateFrom,
        dateTo,
        beforeEventBuffer,
        afterEventBuffer,
      });

      expect(result.hasConflict).toBe(true);
      
      const expectedStart = dayjs(originalBusyTime.start).subtract(afterEventBuffer, "minute").toDate();
      const expectedEnd = dayjs(originalBusyTime.end).add(beforeEventBuffer, "minute").toDate();
      
      expect(result.conflictingBusyTimes[0].start).toEqual(expectedStart);
      expect(result.conflictingBusyTimes[0].end).toEqual(expectedEnd);
      expect(result.conflictingBusyTimes[0].source).toBe("google_calendar");
    });
  });
});
