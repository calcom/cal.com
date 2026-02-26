import { describe, it, expect, vi, beforeEach } from "vitest";

import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { BookingAccessService } from "@calcom/features/bookings/services/BookingAccessService";
import { checkIfFreeEmailDomain } from "@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain";
import { BookingStatus } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import { getUpcomingBookingsByDomainHandler } from "./getUpcomingBookingsByDomain.handler";

vi.mock("@calcom/features/bookings/repositories/BookingRepository");
vi.mock("@calcom/features/bookings/services/BookingAccessService");
vi.mock("@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain");
vi.mock("@calcom/features/watchlist/lib/utils/normalization", () => ({
  extractDomainFromEmail: (email: string) => email.split("@")[1],
}));

describe("getUpcomingBookingsByDomainHandler", () => {
  const mockUser = {
    id: 1,
    email: "host@example.com",
    name: "Host User",
  };

  const tomorrow = new Date(Date.now() + 86400000);

  const mockBooking = {
    id: 100,
    uid: "booking-uid",
    userId: 1,
    startTime: tomorrow,
    status: BookingStatus.ACCEPTED,
    attendees: [{ email: "booker@company.com" }],
    report: null,
  };

  const mockBookingRepo = {
    findByUidIncludeReport: vi.fn(),
    findUpcomingByAttendeeDomain: vi.fn(),
  };

  const mockBookingAccessService = {
    doesUserIdHaveAccessToBooking: vi.fn(),
  };

  function callHandler(bookingUid = "booking-uid") {
    return getUpcomingBookingsByDomainHandler({
      ctx: { user: mockUser },
      input: { bookingUid },
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(BookingRepository).mockImplementation(function () {
      return mockBookingRepo as any;
    });
    vi.mocked(BookingAccessService).mockImplementation(function () {
      return mockBookingAccessService as any;
    });
    vi.mocked(checkIfFreeEmailDomain).mockResolvedValue(false);
  });

  describe("access control", () => {
    it("should throw FORBIDDEN when user lacks access", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(false);

      await expect(callHandler()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("should throw NOT_FOUND when booking doesn't exist", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeReport.mockResolvedValue(null);

      await expect(callHandler()).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("should throw BAD_REQUEST when booking has no attendees", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeReport.mockResolvedValue({
        ...mockBooking,
        attendees: [],
      });

      await expect(callHandler()).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Booking has no attendees",
      });
    });
  });

  describe("free email domain detection", () => {
    it("should return isFreeDomain: true with empty bookings for free domains", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeReport.mockResolvedValue({
        ...mockBooking,
        attendees: [{ email: "booker@gmail.com" }],
      });
      vi.mocked(checkIfFreeEmailDomain).mockResolvedValue(true);

      const result = await callHandler();

      expect(result).toEqual({
        domain: "gmail.com",
        isFreeDomain: true,
        bookerEmail: "booker@gmail.com",
        bookings: [],
      });
      expect(mockBookingRepo.findUpcomingByAttendeeDomain).not.toHaveBeenCalled();
    });

    it("should query domain bookings when not a free domain", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeReport.mockResolvedValue(mockBooking);
      mockBookingRepo.findUpcomingByAttendeeDomain.mockResolvedValue([]);

      const result = await callHandler();

      expect(result.isFreeDomain).toBe(false);
      expect(mockBookingRepo.findUpcomingByAttendeeDomain).toHaveBeenCalledWith({
        domain: "company.com",
        hostUserId: mockUser.id,
      });
    });
  });

  describe("domain booking preview", () => {
    beforeEach(() => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeReport.mockResolvedValue(mockBooking);
    });

    it("should return upcoming bookings from the same domain", async () => {
      const dayAfterTomorrow = new Date(Date.now() + 172800000);
      mockBookingRepo.findUpcomingByAttendeeDomain.mockResolvedValue([
        {
          uid: "match-1",
          title: "Meeting with Alice",
          startTime: tomorrow,
          endTime: new Date(tomorrow.getTime() + 3600000),
          attendees: [{ email: "alice@company.com" }],
          report: null,
        },
        {
          uid: "match-2",
          title: "Meeting with Bob",
          startTime: dayAfterTomorrow,
          endTime: new Date(dayAfterTomorrow.getTime() + 3600000),
          attendees: [{ email: "bob@company.com" }],
          report: null,
        },
      ]);

      const result = await callHandler();

      expect(result.domain).toBe("company.com");
      expect(result.bookings).toHaveLength(2);
      expect(result.bookings[0]).toEqual({
        uid: "match-1",
        title: "Meeting with Alice",
        startTime: tomorrow,
        endTime: new Date(tomorrow.getTime() + 3600000),
        attendeeEmail: "alice@company.com",
      });
    });

    it("should filter out already-reported bookings", async () => {
      mockBookingRepo.findUpcomingByAttendeeDomain.mockResolvedValue([
        {
          uid: "unreported",
          title: "Clean booking",
          startTime: tomorrow,
          endTime: new Date(tomorrow.getTime() + 3600000),
          attendees: [{ email: "clean@company.com" }],
          report: null,
        },
        {
          uid: "reported",
          title: "Already reported",
          startTime: tomorrow,
          endTime: new Date(tomorrow.getTime() + 3600000),
          attendees: [{ email: "reported@company.com" }],
          report: { id: "r1" },
        },
      ]);

      const result = await callHandler();

      expect(result.bookings).toHaveLength(1);
      expect(result.bookings[0].uid).toBe("unreported");
    });

    it("should handle bookings with no attendee email gracefully", async () => {
      mockBookingRepo.findUpcomingByAttendeeDomain.mockResolvedValue([
        {
          uid: "no-attendee",
          title: "Empty attendee",
          startTime: tomorrow,
          endTime: new Date(tomorrow.getTime() + 3600000),
          attendees: [],
          report: null,
        },
      ]);

      const result = await callHandler();

      expect(result.bookings).toHaveLength(1);
      expect(result.bookings[0].attendeeEmail).toBe("");
    });
  });

  describe("host user scoping", () => {
    it("should use booking.userId as hostUserId", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeReport.mockResolvedValue({
        ...mockBooking,
        userId: 99,
      });
      mockBookingRepo.findUpcomingByAttendeeDomain.mockResolvedValue([]);

      await callHandler();

      expect(mockBookingRepo.findUpcomingByAttendeeDomain).toHaveBeenCalledWith({
        domain: "company.com",
        hostUserId: 99,
      });
    });

    it("should fall back to user.id when booking.userId is null", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeReport.mockResolvedValue({
        ...mockBooking,
        userId: null,
      });
      mockBookingRepo.findUpcomingByAttendeeDomain.mockResolvedValue([]);

      await callHandler();

      expect(mockBookingRepo.findUpcomingByAttendeeDomain).toHaveBeenCalledWith({
        domain: "company.com",
        hostUserId: mockUser.id,
      });
    });
  });
});
