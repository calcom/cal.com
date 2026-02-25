import dayjs from "@calcom/dayjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IAvailableSlotsService } from "./util";
import { AvailableSlotsService } from "./util";

describe("AvailableSlotsService - _getGuestAvailabilityForReschedule", () => {
  type GetGuestAvailability = typeof AvailableSlotsService.prototype._getGuestAvailabilityForReschedule;
  let service: AvailableSlotsService;
  let mockDependencies: {
    bookingRepo: {
      findBookingAttendeesByUid: ReturnType<typeof vi.fn>;
    };
    userRepo: {
      findUsersByEmailsForAvailability: ReturnType<typeof vi.fn>;
    };
    userAvailabilityService: {
      getUsersAvailability: ReturnType<typeof vi.fn>;
    };
  };

  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as unknown as Parameters<GetGuestAvailability>[0]["loggerWithEventDetails"];

  /** Helper to build a mock session ctx for host-initiated reschedules */
  const hostCtx = (email: string) => ({
    session: { user: { id: 1, email } },
  });

  /** Helper for unauthenticated (guest via email link) reschedules */
  const guestCtx = undefined;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDependencies = {
      bookingRepo: {
        findBookingAttendeesByUid: vi.fn(),
      },
      userRepo: {
        findUsersByEmailsForAvailability: vi.fn(),
      },
      userAvailabilityService: {
        getUsersAvailability: vi.fn(),
      },
    };

    service = new AvailableSlotsService(mockDependencies as unknown as IAvailableSlotsService);
  });

  const callMethod = (overrides: Partial<Parameters<GetGuestAvailability>[0]> = {}) =>
    (
      service as unknown as { _getGuestAvailabilityForReschedule: GetGuestAvailability }
    )._getGuestAvailabilityForReschedule({
      rescheduleUid: "booking-123",
      ctx: hostCtx("host@cal.com"), // default: host-initiated
      startTime: dayjs("2026-03-01"),
      endTime: dayjs("2026-03-08"),
      duration: 30,
      bypassBusyCalendarTimes: false,
      silentCalendarFailures: false,
      mode: "slots",
      loggerWithEventDetails: mockLogger,
      ...overrides,
    });

  // ─── Host-vs-Guest Reschedule Distinction ───────────────────────────

  describe("host-vs-guest reschedule distinction", () => {
    it("should skip guest availability check when no session (guest self-reschedule via email link)", async () => {
      mockDependencies.bookingRepo.findBookingAttendeesByUid.mockResolvedValue({
        userId: 1,
        attendees: [{ email: "guest@cal.com" }],
      });

      const result = await callMethod({ ctx: guestCtx });

      expect(result).toBeNull();
      // Should not even look up Cal.com users — early return
      expect(mockDependencies.userRepo.findUsersByEmailsForAvailability).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("No authenticated session")
      );
    });

    it("should skip guest availability check when session has no user email", async () => {
      mockDependencies.bookingRepo.findBookingAttendeesByUid.mockResolvedValue({
        userId: 1,
        attendees: [{ email: "guest@cal.com" }],
      });

      const result = await callMethod({ ctx: { session: { user: { id: 1 } } } });

      expect(result).toBeNull();
      expect(mockDependencies.userRepo.findUsersByEmailsForAvailability).not.toHaveBeenCalled();
    });

    it("should skip guest availability check when logged-in user is an attendee (guest self-reschedule while logged in)", async () => {
      mockDependencies.bookingRepo.findBookingAttendeesByUid.mockResolvedValue({
        userId: 1,
        attendees: [{ email: "guest@cal.com" }],
      });

      // Guest is logged in with their own Cal.com account
      const result = await callMethod({ ctx: hostCtx("guest@cal.com") });

      expect(result).toBeNull();
      expect(mockDependencies.userRepo.findUsersByEmailsForAvailability).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("guest self-reschedule")
      );
    });

    it("should check guest availability when host is logged in and reschedules", async () => {
      const hostUserId = 1;
      const guestUser = {
        id: 2,
        email: "guest@cal.com",
        username: "guest",
        timeZone: "UTC",
        bufferTime: 0,
        timeFormat: 24,
        defaultScheduleId: 1,
        isPlatformManaged: false,
        schedules: [],
        availability: [],
        allSelectedCalendars: [],
        userLevelSelectedCalendars: [],
        travelSchedules: [],
        credentials: [],
      };

      const mockDateRanges = [
        { start: dayjs("2026-03-01T09:00:00Z"), end: dayjs("2026-03-01T17:00:00Z") },
      ];

      mockDependencies.bookingRepo.findBookingAttendeesByUid.mockResolvedValue({
        userId: hostUserId,
        attendees: [{ email: "guest@cal.com" }],
      });
      mockDependencies.userRepo.findUsersByEmailsForAvailability.mockResolvedValue([guestUser]);
      mockDependencies.userAvailabilityService.getUsersAvailability.mockResolvedValue([
        { dateRanges: mockDateRanges },
      ]);

      const result = await callMethod({ ctx: hostCtx("host@cal.com") });

      expect(result).toEqual(mockDateRanges);
      expect(mockDependencies.userRepo.findUsersByEmailsForAvailability).toHaveBeenCalledWith({
        emails: ["guest@cal.com"],
      });
    });
  });

  // ─── Booking & Attendee Edge Cases ──────────────────────────────────

  describe("when booking has no attendees", () => {
    it("should return null if booking not found", async () => {
      mockDependencies.bookingRepo.findBookingAttendeesByUid.mockResolvedValue(null);

      const result = await callMethod();

      expect(result).toBeNull();
      expect(mockDependencies.userRepo.findUsersByEmailsForAvailability).not.toHaveBeenCalled();
    });

    it("should return null if booking has empty attendees array", async () => {
      mockDependencies.bookingRepo.findBookingAttendeesByUid.mockResolvedValue({
        userId: 1,
        attendees: [],
      });

      const result = await callMethod();

      expect(result).toBeNull();
    });
  });

  describe("when attendee is not a Cal.com user", () => {
    it("should return null when no Cal.com users found for attendee emails", async () => {
      mockDependencies.bookingRepo.findBookingAttendeesByUid.mockResolvedValue({
        userId: 1,
        attendees: [{ email: "external-guest@gmail.com" }],
      });
      mockDependencies.userRepo.findUsersByEmailsForAvailability.mockResolvedValue([]);

      const result = await callMethod();

      expect(result).toBeNull();
      expect(mockDependencies.userRepo.findUsersByEmailsForAvailability).toHaveBeenCalledWith({
        emails: ["external-guest@gmail.com"],
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "No Cal.com guest users found for reschedule, skipping guest availability check"
      );
    });
  });

  describe("when attendee is the host (same as organizer)", () => {
    it("should return null when the only Cal.com user found is the host", async () => {
      const hostUserId = 1;
      mockDependencies.bookingRepo.findBookingAttendeesByUid.mockResolvedValue({
        userId: hostUserId,
        attendees: [{ email: "host@cal.com" }],
      });
      // The found user has the same ID as the booking's host
      mockDependencies.userRepo.findUsersByEmailsForAvailability.mockResolvedValue([
        { id: hostUserId, email: "host@cal.com", username: "host" },
      ]);

      // Use a team admin email (not the host email, not an attendee email)
      const result = await callMethod({ ctx: hostCtx("admin@cal.com") });

      expect(result).toBeNull();
    });
  });

  describe("when attendee is a Cal.com user (guest) — host reschedule", () => {
    it("should fetch and return guest availability date ranges", async () => {
      const hostUserId = 1;
      const guestUserId = 2;
      const guestUser = {
        id: guestUserId,
        email: "guest@cal.com",
        username: "guest",
        timeZone: "UTC",
        bufferTime: 0,
        timeFormat: 24,
        defaultScheduleId: 1,
        isPlatformManaged: false,
        schedules: [],
        availability: [],
        allSelectedCalendars: [],
        userLevelSelectedCalendars: [],
        travelSchedules: [],
        credentials: [],
      };

      const mockDateRanges = [
        { start: dayjs("2026-03-01T09:00:00Z"), end: dayjs("2026-03-01T17:00:00Z") },
        { start: dayjs("2026-03-02T09:00:00Z"), end: dayjs("2026-03-02T17:00:00Z") },
      ];

      mockDependencies.bookingRepo.findBookingAttendeesByUid.mockResolvedValue({
        userId: hostUserId,
        attendees: [{ email: "guest@cal.com" }],
      });
      mockDependencies.userRepo.findUsersByEmailsForAvailability.mockResolvedValue([guestUser]);
      mockDependencies.userAvailabilityService.getUsersAvailability.mockResolvedValue([
        { dateRanges: mockDateRanges },
      ]);

      const result = await callMethod({ ctx: hostCtx("host@cal.com") });

      expect(result).toEqual(mockDateRanges);
      expect(mockDependencies.userAvailabilityService.getUsersAvailability).toHaveBeenCalledWith({
        users: [{ ...guestUser, isFixed: true }],
        query: expect.objectContaining({
          dateFrom: expect.any(String),
          dateTo: expect.any(String),
          duration: 30,
          returnDateOverrides: false,
        }),
        initialData: expect.objectContaining({
          rescheduleUid: "booking-123",
        }),
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Found Cal.com guest user(s) for reschedule",
        expect.objectContaining({ guestEmails: ["guest@cal.com"] })
      );
    });

    it("should return null when getUsersAvailability returns empty array", async () => {
      mockDependencies.bookingRepo.findBookingAttendeesByUid.mockResolvedValue({
        userId: 1,
        attendees: [{ email: "guest@cal.com" }],
      });
      mockDependencies.userRepo.findUsersByEmailsForAvailability.mockResolvedValue([
        { id: 2, email: "guest@cal.com", username: "guest" },
      ]);
      mockDependencies.userAvailabilityService.getUsersAvailability.mockResolvedValue([]);

      const result = await callMethod({ ctx: hostCtx("host@cal.com") });

      expect(result).toBeNull();
    });
  });

  describe("with multiple attendees", () => {
    it("should use the first non-host Cal.com user found", async () => {
      const hostUserId = 1;
      const firstGuestUser = { id: 2, email: "first@cal.com", username: "first" };
      const secondGuestUser = { id: 3, email: "second@cal.com", username: "second" };

      const mockDateRanges = [
        { start: dayjs("2026-03-01T10:00:00Z"), end: dayjs("2026-03-01T12:00:00Z") },
      ];

      mockDependencies.bookingRepo.findBookingAttendeesByUid.mockResolvedValue({
        userId: hostUserId,
        attendees: [
          { email: "first@cal.com" },
          { email: "second@cal.com" },
          { email: "external@gmail.com" },
        ],
      });
      // Return both Cal.com users
      mockDependencies.userRepo.findUsersByEmailsForAvailability.mockResolvedValue([
        firstGuestUser,
        secondGuestUser,
      ]);
      mockDependencies.userAvailabilityService.getUsersAvailability.mockResolvedValue([
        { dateRanges: mockDateRanges },
      ]);

      const result = await callMethod({ ctx: hostCtx("host@cal.com") });

      expect(result).toEqual(mockDateRanges);
      // Verify it used the first guest user
      expect(mockDependencies.userAvailabilityService.getUsersAvailability).toHaveBeenCalledWith(
        expect.objectContaining({
          users: [expect.objectContaining({ id: 2, email: "first@cal.com" })],
        })
      );
    });
  });
});
