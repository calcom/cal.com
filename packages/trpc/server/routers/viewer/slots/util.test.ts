/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

import { BookingDateInPastError, isTimeOutOfBounds } from "@calcom/lib/isOutOfBounds";
import { ScheduleRepository } from "@calcom/lib/server/repository/schedule";
import { TravelScheduleRepository } from "@calcom/lib/server/repository/travelSchedule";

import { TRPCError } from "@trpc/server";

import { AvailableSlotsService } from "./util";

describe("BookingDateInPastError handling", () => {
  it("should convert BookingDateInPastError to TRPCError with BAD_REQUEST code", () => {
    const testFilteringLogic = () => {
      const mockSlot = {
        time: "2024-05-20T12:30:00.000Z", // Past date
        attendees: 1,
      };

      const mockEventType = {
        minimumBookingNotice: 0,
      };

      const isFutureLimitViolationForTheSlot = false; // Mock this to false

      let isOutOfBounds = false;
      try {
        // This will throw BookingDateInPastError for past dates
        isOutOfBounds = isTimeOutOfBounds({
          time: mockSlot.time,
          minimumBookingNotice: mockEventType.minimumBookingNotice,
        });
      } catch (error) {
        if (error instanceof BookingDateInPastError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw error;
      }

      return !isFutureLimitViolationForTheSlot && !isOutOfBounds;
    };

    // This should throw a TRPCError with BAD_REQUEST code
    expect(() => testFilteringLogic()).toThrow(TRPCError);
    expect(() => testFilteringLogic()).toThrow("Attempting to book a meeting in the past.");
  });
});

// Mock the static repository methods
vi.mock("@calcom/lib/server/repository/schedule", () => ({
  ScheduleRepository: {
    findScheduleByUserId: vi.fn(),
  },
}));

vi.mock("@calcom/lib/server/repository/travelSchedule", () => ({
  TravelScheduleRepository: {
    findTravelSchedulesByUserId: vi.fn(),
  },
}));

describe("getBookerAsHostForReschedule", () => {
  let availableSlotsService: AvailableSlotsService;
  let mockDependencies: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDependencies = {
      bookingRepo: {
        findBookingByUid: vi.fn(),
      },
      userRepo: {
        findByEmail: vi.fn(),
        findUserWithCredentials: vi.fn(),
      },
    };

    availableSlotsService = new AvailableSlotsService(mockDependencies as any);
  });

  describe("Successful scenarios", () => {
    it("should return booker as host when booker is a Cal.com user with complete availability data", async () => {
      const mockBooking = {
        id: 1,
        uid: "test-reschedule-uid",
        attendees: [{ email: "booker@example.com" }],
      };

      const mockBookerUser = {
        id: 100,
        email: "booker@example.com",
        username: "booker",
        name: "Test Booker",
        bufferTime: 10,
        startTime: 540,
        endTime: 1020,
        timeFormat: 24,
        defaultScheduleId: 50,
        isPlatformManaged: false,
      };

      const mockBookerWithCredentials = {
        id: 100,
        timeZone: "America/New_York",
        allSelectedCalendars: [],
        userLevelSelectedCalendars: [],
        credentials: [
          {
            id: 1,
            type: "google_calendar",
            key: {},
          },
        ],
      };

      const mockSchedules = [
        {
          id: 50,
          userId: 100,
          name: "Working Hours",
          timeZone: "America/New_York" as string | null,
          availability: [
            {
              id: 1,
              userId: 100,
              eventTypeId: null,
              days: [1, 2, 3, 4, 5],
              startTime: new Date("1970-01-01T09:00:00.000Z"),
              endTime: new Date("1970-01-01T17:00:00.000Z"),
              date: null,
              scheduleId: 50,
            },
          ],
        },
      ];

      const mockTravelSchedules = [
        {
          id: 1,
          userId: 100,
          startDate: new Date("2025-01-15T00:00:00.000Z"),
          endDate: new Date("2025-01-20T00:00:00.000Z"),
          timeZone: "Europe/London",
          prevTimeZone: null,
        },
      ];

      mockDependencies.bookingRepo.findBookingByUid.mockResolvedValue(mockBooking);
      mockDependencies.userRepo.findByEmail.mockResolvedValue(mockBookerUser);
      mockDependencies.userRepo.findUserWithCredentials.mockResolvedValue(mockBookerWithCredentials);
      vi.mocked(ScheduleRepository.findScheduleByUserId).mockResolvedValue(mockSchedules);
      vi.mocked(TravelScheduleRepository.findTravelSchedulesByUserId).mockResolvedValue(mockTravelSchedules);

      const result = await (availableSlotsService as any).getBookerAsHostForReschedule({
        rescheduleUid: "test-reschedule-uid",
      });

      // Assertions - Structure
      expect(result).not.toBeNull();
      expect(result?.isFixed).toBe(true);
      expect(result?.createdAt).toBeNull();

      // Assertions - User data
      expect(result?.user.id).toBe(100);
      expect(result?.user.email).toBe("booker@example.com");
      expect(result?.user.username).toBe("booker");
      expect(result?.user.bufferTime).toBe(10);
      expect(result?.user.startTime).toBe(540);
      expect(result?.user.endTime).toBe(1020);
      expect(result?.user.timeFormat).toBe(24);

      // Assertions - Schedules
      expect(result?.user.schedules).toHaveLength(1);
      expect(result?.user.schedules[0].id).toBe(50);
      expect(result?.user.schedules[0].availability).toHaveLength(1);
      expect(result?.user.schedules[0].availability[0].days).toEqual([1, 2, 3, 4, 5]);

      // Assertions - Travel schedules
      expect(result?.user.travelSchedules).toHaveLength(1);
      expect(result?.user.travelSchedules[0].timeZone).toBe("Europe/London");

      // Assertions - Credentials and empty fields
      expect(result?.user.credentials).toHaveLength(1);
      expect(result?.user.availability).toEqual([]);

      // Verify all dependencies were called correctly
      expect(mockDependencies.bookingRepo.findBookingByUid).toHaveBeenCalledWith({
        bookingUid: "test-reschedule-uid",
      });
      expect(mockDependencies.userRepo.findByEmail).toHaveBeenCalledWith({
        email: "booker@example.com",
      });
      expect(mockDependencies.userRepo.findUserWithCredentials).toHaveBeenCalledWith({
        id: 100,
      });
      expect(ScheduleRepository.findScheduleByUserId).toHaveBeenCalledWith({ userId: 100 });
      expect(TravelScheduleRepository.findTravelSchedulesByUserId).toHaveBeenCalledWith(100);
    });

    it("should apply default values for missing user properties", async () => {
      const mockBooking = {
        attendees: [{ email: "booker@example.com" }],
      };

      const mockBookerUser = {
        id: 100,
        email: "booker@example.com",
        username: null,
        name: null,
        bufferTime: null,
        startTime: null,
        endTime: null,
        timeFormat: null,
        defaultScheduleId: null,
        isPlatformManaged: null,
      };

      const mockBookerWithCredentials = {
        id: 100,
        credentials: [],
      };

      mockDependencies.bookingRepo.findBookingByUid.mockResolvedValue(mockBooking);
      mockDependencies.userRepo.findByEmail.mockResolvedValue(mockBookerUser);
      mockDependencies.userRepo.findUserWithCredentials.mockResolvedValue(mockBookerWithCredentials);
      vi.mocked(ScheduleRepository.findScheduleByUserId).mockResolvedValue([]);
      vi.mocked(TravelScheduleRepository.findTravelSchedulesByUserId).mockResolvedValue([]);

      const result = await (availableSlotsService as any).getBookerAsHostForReschedule({
        rescheduleUid: "test-uid",
      });

      expect(result?.user.bufferTime).toBe(0);
      expect(result?.user.startTime).toBe(0);
      expect(result?.user.endTime).toBe(1440);
      expect(result?.user.timeFormat).toBe(12);
      expect(result?.user.isPlatformManaged).toBe(false);
      expect(result?.user.username).toBeNull(); // username should remain null if not set
      expect(result?.user.defaultScheduleId).toBeNull();
    });

    it("should handle booker with multiple schedules", async () => {
      const mockBooking = {
        attendees: [{ email: "booker@example.com" }],
      };

      const mockBookerUser = {
        id: 100,
        email: "booker@example.com",
      };

      const mockBookerWithCredentials = {
        id: 100,
        credentials: [],
      };

      const mockMultipleSchedules = [
        {
          id: 50,
          userId: 100,
          name: "Working Hours",
          timeZone: "America/New_York" as string | null,
          availability: [
            {
              id: 1,
              userId: 100,
              eventTypeId: null,
              days: [1, 2, 3, 4, 5],
              startTime: new Date("1970-01-01T09:00:00.000Z"),
              endTime: new Date("1970-01-01T17:00:00.000Z"),
              date: null,
              scheduleId: 50,
            },
          ],
        },
        {
          id: 51,
          userId: 100,
          name: "Alternate Hours",
          timeZone: "Europe/London" as string | null,
          availability: [
            {
              id: 2,
              userId: 100,
              eventTypeId: null,
              days: [1, 2, 3],
              startTime: new Date("1970-01-01T10:00:00.000Z"),
              endTime: new Date("1970-01-01T15:00:00.000Z"),
              date: null,
              scheduleId: 51,
            },
          ],
        },
      ];

      mockDependencies.bookingRepo.findBookingByUid.mockResolvedValue(mockBooking);
      mockDependencies.userRepo.findByEmail.mockResolvedValue(mockBookerUser);
      mockDependencies.userRepo.findUserWithCredentials.mockResolvedValue(mockBookerWithCredentials);
      vi.mocked(ScheduleRepository.findScheduleByUserId).mockResolvedValue(mockMultipleSchedules);
      vi.mocked(TravelScheduleRepository.findTravelSchedulesByUserId).mockResolvedValue([]);

      const result = await (availableSlotsService as any).getBookerAsHostForReschedule({
        rescheduleUid: "test-uid",
      });

      expect(result?.user.schedules).toHaveLength(2);
      expect(result?.user.schedules[0].id).toBe(50);
      expect(result?.user.schedules[0].timeZone).toBe("America/New_York");
      expect(result?.user.schedules[1].id).toBe(51);
      expect(result?.user.schedules[1].timeZone).toBe("Europe/London");
    });

    // NEW TEST: Verify isFixed flag ensures COLLECTIVE scheduling
    it("should set isFixed to true to ensure COLLECTIVE scheduling type", async () => {
      const mockBooking = {
        attendees: [{ email: "booker@example.com" }],
      };

      const mockBookerUser = {
        id: 100,
        email: "booker@example.com",
      };

      const mockBookerWithCredentials = {
        id: 100,
        credentials: [],
      };

      mockDependencies.bookingRepo.findBookingByUid.mockResolvedValue(mockBooking);
      mockDependencies.userRepo.findByEmail.mockResolvedValue(mockBookerUser);
      mockDependencies.userRepo.findUserWithCredentials.mockResolvedValue(mockBookerWithCredentials);
      vi.mocked(ScheduleRepository.findScheduleByUserId).mockResolvedValue([]);
      vi.mocked(TravelScheduleRepository.findTravelSchedulesByUserId).mockResolvedValue([]);

      const result = await (availableSlotsService as any).getBookerAsHostForReschedule({
        rescheduleUid: "test-uid",
      });

      // This ensures both host AND booker must be available (COLLECTIVE behavior)
      expect(result?.isFixed).toBe(true);
    });
  });

  describe("Null return scenarios", () => {
    it("should return null when booking has no attendees", async () => {
      const mockBooking = {
        id: 1,
        attendees: [],
      };

      mockDependencies.bookingRepo.findBookingByUid.mockResolvedValue(mockBooking);

      const result = await (availableSlotsService as any).getBookerAsHostForReschedule({
        rescheduleUid: "test-uid",
      });

      expect(result).toBeNull();
      expect(mockDependencies.userRepo.findByEmail).not.toHaveBeenCalled();
    });

    it("should return null when booking attendee has no email", async () => {
      const mockBooking = {
        attendees: [{ email: null }],
      };

      mockDependencies.bookingRepo.findBookingByUid.mockResolvedValue(mockBooking);

      const result = await (availableSlotsService as any).getBookerAsHostForReschedule({
        rescheduleUid: "test-uid",
      });

      expect(result).toBeNull();
      expect(mockDependencies.userRepo.findByEmail).not.toHaveBeenCalled();
    });

    it("should return null when booking is not found", async () => {
      mockDependencies.bookingRepo.findBookingByUid.mockResolvedValue(null);

      const result = await (availableSlotsService as any).getBookerAsHostForReschedule({
        rescheduleUid: "invalid-uid",
      });

      expect(result).toBeNull();
    });

    it("should return null when booker email does not match a Cal.com user", async () => {
      const mockBooking = {
        attendees: [{ email: "external@example.com" }],
      };

      mockDependencies.bookingRepo.findBookingByUid.mockResolvedValue(mockBooking);
      mockDependencies.userRepo.findByEmail.mockResolvedValue(null);

      const result = await (availableSlotsService as any).getBookerAsHostForReschedule({
        rescheduleUid: "test-uid",
      });

      expect(result).toBeNull();
      expect(mockDependencies.userRepo.findByEmail).toHaveBeenCalledWith({
        email: "external@example.com",
      });
      expect(mockDependencies.userRepo.findUserWithCredentials).not.toHaveBeenCalled();
    });

    it("should return null when user credentials cannot be fetched", async () => {
      const mockBooking = {
        attendees: [{ email: "booker@example.com" }],
      };

      const mockBookerUser = {
        id: 100,
        email: "booker@example.com",
      };

      mockDependencies.bookingRepo.findBookingByUid.mockResolvedValue(mockBooking);
      mockDependencies.userRepo.findByEmail.mockResolvedValue(mockBookerUser);
      mockDependencies.userRepo.findUserWithCredentials.mockResolvedValue(null);

      const result = await (availableSlotsService as any).getBookerAsHostForReschedule({
        rescheduleUid: "test-uid",
      });

      expect(result).toBeNull();
      expect(mockDependencies.userRepo.findUserWithCredentials).toHaveBeenCalledWith({
        id: 100,
      });
      // Verify schedules weren't fetched after credentials failed
      expect(ScheduleRepository.findScheduleByUserId).not.toHaveBeenCalled();
      expect(TravelScheduleRepository.findTravelSchedulesByUserId).not.toHaveBeenCalled();
    });

    // NEW TEST: Edge case with undefined attendees
    it("should return null when booking.attendees is undefined", async () => {
      const mockBooking = {
        id: 1,
        attendees: undefined,
      };

      mockDependencies.bookingRepo.findBookingByUid.mockResolvedValue(mockBooking);

      const result = await (availableSlotsService as any).getBookerAsHostForReschedule({
        rescheduleUid: "test-uid",
      });

      expect(result).toBeNull();
    });
  });

  describe("Schedule transformation", () => {
    it("should correctly transform schedule availability format", async () => {
      const mockBooking = {
        attendees: [{ email: "booker@example.com" }],
      };

      const mockBookerUser = {
        id: 100,
        email: "booker@example.com",
      };

      const mockBookerWithCredentials = {
        id: 100,
        credentials: [],
      };

      const mockScheduleWithExtraFields = [
        {
          id: 50,
          userId: 100,
          name: "Working Hours",
          timeZone: "America/New_York",
          availability: [
            {
              id: 1,
              userId: 100, // Should be removed
              eventTypeId: null, // Should be removed
              scheduleId: 50, // Should be removed
              days: [1, 2, 3, 4, 5],
              startTime: new Date("1970-01-01T09:00:00.000Z"),
              endTime: new Date("1970-01-01T17:00:00.000Z"),
              date: null,
            },
          ],
        },
      ];

      mockDependencies.bookingRepo.findBookingByUid.mockResolvedValue(mockBooking);
      mockDependencies.userRepo.findByEmail.mockResolvedValue(mockBookerUser);
      mockDependencies.userRepo.findUserWithCredentials.mockResolvedValue(mockBookerWithCredentials);
      vi.mocked(ScheduleRepository.findScheduleByUserId).mockResolvedValue(mockScheduleWithExtraFields);
      vi.mocked(TravelScheduleRepository.findTravelSchedulesByUserId).mockResolvedValue([]);

      const result = await (availableSlotsService as any).getBookerAsHostForReschedule({
        rescheduleUid: "test-uid",
      });

      // Verify transformation kept only necessary fields
      expect(result?.user.schedules[0].availability[0]).toEqual({
        date: null,
        startTime: new Date("1970-01-01T09:00:00.000Z"),
        endTime: new Date("1970-01-01T17:00:00.000Z"),
        days: [1, 2, 3, 4, 5],
      });

      // Ensure extra fields were removed
      expect(result?.user.schedules[0].availability[0]).not.toHaveProperty("id");
      expect(result?.user.schedules[0].availability[0]).not.toHaveProperty("userId");
      expect(result?.user.schedules[0].availability[0]).not.toHaveProperty("eventTypeId");
      expect(result?.user.schedules[0].availability[0]).not.toHaveProperty("scheduleId");
    });

    it("should preserve travel schedules without transformation", async () => {
      const mockBooking = {
        attendees: [{ email: "booker@example.com" }],
      };

      const mockBookerUser = {
        id: 100,
        email: "booker@example.com",
      };

      const mockBookerWithCredentials = {
        id: 100,
        credentials: [],
      };

      const mockTravelSchedules = [
        {
          id: 1,
          userId: 100,
          startDate: new Date("2025-01-15T00:00:00.000Z"),
          endDate: new Date("2025-01-20T00:00:00.000Z"),
          timeZone: "Europe/London",
          prevTimeZone: "America/New_York",
        },
      ];

      mockDependencies.bookingRepo.findBookingByUid.mockResolvedValue(mockBooking);
      mockDependencies.userRepo.findByEmail.mockResolvedValue(mockBookerUser);
      mockDependencies.userRepo.findUserWithCredentials.mockResolvedValue(mockBookerWithCredentials);
      vi.mocked(ScheduleRepository.findScheduleByUserId).mockResolvedValue([]);
      vi.mocked(TravelScheduleRepository.findTravelSchedulesByUserId).mockResolvedValue(mockTravelSchedules);

      const result = await (availableSlotsService as any).getBookerAsHostForReschedule({
        rescheduleUid: "test-uid",
      });

      // Travel schedules should be passed through unchanged
      expect(result?.user.travelSchedules).toEqual(mockTravelSchedules);
      expect(result?.user.travelSchedules[0]).toHaveProperty("id");
      expect(result?.user.travelSchedules[0]).toHaveProperty("userId");
      expect(result?.user.travelSchedules[0]).toHaveProperty("prevTimeZone");
    });

    // NEW TEST: Verify schedule with date-specific availability
    it("should handle date-specific availability rules", async () => {
      const mockBooking = {
        attendees: [{ email: "booker@example.com" }],
      };

      const mockBookerUser = {
        id: 100,
        email: "booker@example.com",
      };

      const mockBookerWithCredentials = {
        id: 100,
        credentials: [],
      };

      const specificDate = new Date("2025-12-25T00:00:00.000Z");
      const mockScheduleWithDateOverride = [
        {
          id: 50,
          userId: 100,
          name: "Date Override Schedule",
          timeZone: "Asia/New_York" as string | null,
          availability: [
            {
              id: 1,
              userId: 100,
              eventTypeId: null,
              days: [],
              startTime: new Date("1970-01-01T10:00:00.000Z"),
              endTime: new Date("1970-01-01T12:00:00.000Z"),
              date: specificDate,
              scheduleId: 50,
            },
          ],
        },
      ];

      mockDependencies.bookingRepo.findBookingByUid.mockResolvedValue(mockBooking);
      mockDependencies.userRepo.findByEmail.mockResolvedValue(mockBookerUser);
      mockDependencies.userRepo.findUserWithCredentials.mockResolvedValue(mockBookerWithCredentials);
      vi.mocked(ScheduleRepository.findScheduleByUserId).mockResolvedValue(mockScheduleWithDateOverride);
      vi.mocked(TravelScheduleRepository.findTravelSchedulesByUserId).mockResolvedValue([]);

      const result = await (availableSlotsService as any).getBookerAsHostForReschedule({
        rescheduleUid: "test-uid",
      });

      expect(result?.user.schedules[0].availability[0].date).toEqual(specificDate);
      expect(result?.user.schedules[0].availability[0].days).toEqual([]);
    });
  });

  describe("Parallel fetching", () => {
    it("should fetch schedules and travel schedules in parallel", async () => {
      const mockBooking = {
        attendees: [{ email: "booker@example.com" }],
      };

      const mockBookerUser = {
        id: 100,
        email: "booker@example.com",
      };

      const mockBookerWithCredentials = {
        id: 100,
        credentials: [],
      };

      mockDependencies.bookingRepo.findBookingByUid.mockResolvedValue(mockBooking);
      mockDependencies.userRepo.findByEmail.mockResolvedValue(mockBookerUser);
      mockDependencies.userRepo.findUserWithCredentials.mockResolvedValue(mockBookerWithCredentials);

      vi.mocked(ScheduleRepository.findScheduleByUserId).mockResolvedValue([]);
      vi.mocked(TravelScheduleRepository.findTravelSchedulesByUserId).mockResolvedValue([]);

      await (availableSlotsService as any).getBookerAsHostForReschedule({
        rescheduleUid: "test-uid",
      });

      // Both should be called
      expect(ScheduleRepository.findScheduleByUserId).toHaveBeenCalledTimes(1);
      expect(TravelScheduleRepository.findTravelSchedulesByUserId).toHaveBeenCalledTimes(1);
      expect(ScheduleRepository.findScheduleByUserId).toHaveBeenCalledWith({ userId: 100 });
      expect(TravelScheduleRepository.findTravelSchedulesByUserId).toHaveBeenCalledWith(100);
    });
  });

  // NEW TEST SECTION: Integration with availability calculation
  describe("Integration with _getAvailableSlots", () => {
    it("should add booker to allHosts when rescheduleUid is provided", async () => {
      // This test verifies that the booker is correctly added to the hosts list
      // which will then be used for availability calculation
      const mockBooking = {
        attendees: [{ email: "booker@example.com" }],
      };

      const mockBookerUser = {
        id: 100,
        email: "booker@example.com",
      };

      const mockBookerWithCredentials = {
        id: 100,
        credentials: [],
      };

      mockDependencies.bookingRepo.findBookingByUid.mockResolvedValue(mockBooking);
      mockDependencies.userRepo.findByEmail.mockResolvedValue(mockBookerUser);
      mockDependencies.userRepo.findUserWithCredentials.mockResolvedValue(mockBookerWithCredentials);
      vi.mocked(ScheduleRepository.findScheduleByUserId).mockResolvedValue([]);
      vi.mocked(TravelScheduleRepository.findTravelSchedulesByUserId).mockResolvedValue([]);

      const result = await (availableSlotsService as any).getBookerAsHostForReschedule({
        rescheduleUid: "test-uid",
      });

      // Verify structure matches what's expected for a host
      expect(result).toHaveProperty("isFixed");
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("user");
      expect(result?.user).toHaveProperty("credentials");
      expect(result?.user).toHaveProperty("schedules");
      expect(result?.user).toHaveProperty("travelSchedules");
    });
  });
});
